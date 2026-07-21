import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

jest.mock('./../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {
    $connect = jest.fn();
    $disconnect = jest.fn();
  },
}));

import { AppModule } from './../src/app.module';
import { DashboardService } from './../src/dashboard/dashboard.service';
import { HealthChecksService } from './../src/health-checks/health-checks.service';
import { MonitorsService } from './../src/monitors/monitors.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const monitorsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const healthChecksService = {
    checkMonitor: jest.fn(),
  };
  const dashboardService = {
    getSummary: jest.fn(),
    getMonitorCheckResults: jest.fn(),
    getMonitorIncidents: jest.fn(),
    getIncidents: jest.fn(),
    getPublicStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(MonitorsService)
      .useValue(monitorsService)
      .overrideProvider(HealthChecksService)
      .useValue(healthChecksService)
      .overrideProvider(DashboardService)
      .useValue(dashboardService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      app: 'PulseDock API',
      status: 'running',
    });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const health = body as { timestamp?: unknown };

        expect(body).toMatchObject({
          status: 'ok',
          service: 'pulsedock-api',
        });
        expect(typeof health.timestamp).toBe('string');
      });
  });

  it('/monitors (POST) creates a monitor', () => {
    const monitor = {
      id: 'monitor-1',
      name: 'PulseDock API',
      url: 'https://api.example.com/health',
    };
    monitorsService.create.mockResolvedValue(monitor);

    return request(app.getHttpServer())
      .post('/monitors')
      .send({
        name: 'PulseDock API',
        url: 'https://api.example.com/health',
        intervalMinutes: 5,
      })
      .expect(201)
      .expect(monitor)
      .expect(() => {
        expect(monitorsService.create).toHaveBeenCalledWith({
          name: 'PulseDock API',
          url: 'https://api.example.com/health',
          intervalMinutes: 5,
        });
      });
  });

  it('/monitors (POST) rejects an invalid monitor', () => {
    return request(app.getHttpServer())
      .post('/monitors')
      .send({
        name: 'Invalid',
        url: 'not-a-url',
        expectedStatusCode: 700,
      })
      .expect(400)
      .expect(() => {
        expect(monitorsService.create).not.toHaveBeenCalled();
      });
  });

  it('/monitors (GET) lists monitors', () => {
    monitorsService.findAll.mockResolvedValue([{ id: 'monitor-1' }]);

    return request(app.getHttpServer())
      .get('/monitors')
      .expect(200)
      .expect([{ id: 'monitor-1' }]);
  });

  it('/monitors/:id (GET) returns one monitor', () => {
    monitorsService.findOne.mockResolvedValue({ id: 'monitor-1' });

    return request(app.getHttpServer())
      .get('/monitors/monitor-1')
      .expect(200)
      .expect({ id: 'monitor-1' });
  });

  it('/monitors/:id (PATCH) updates a monitor', () => {
    monitorsService.update.mockResolvedValue({
      id: 'monitor-1',
      name: 'Updated',
    });

    return request(app.getHttpServer())
      .patch('/monitors/monitor-1')
      .send({ name: 'Updated' })
      .expect(200)
      .expect({ id: 'monitor-1', name: 'Updated' });
  });

  it('/monitors/:id (DELETE) disables a monitor', () => {
    monitorsService.remove.mockResolvedValue({
      id: 'monitor-1',
      isActive: false,
    });

    return request(app.getHttpServer())
      .delete('/monitors/monitor-1')
      .expect(200)
      .expect({ id: 'monitor-1', isActive: false });
  });

  it('/monitors/:id/check (POST) runs a health check', () => {
    healthChecksService.checkMonitor.mockResolvedValue({
      id: 'check-1',
      monitorId: 'monitor-1',
      success: true,
      statusCode: 200,
    });

    return request(app.getHttpServer())
      .post('/monitors/monitor-1/check')
      .expect(201)
      .expect({
        id: 'check-1',
        monitorId: 'monitor-1',
        success: true,
        statusCode: 200,
      })
      .expect(() => {
        expect(healthChecksService.checkMonitor).toHaveBeenCalledWith(
          'monitor-1',
        );
      });
  });

  it('/dashboard/summary (GET) returns dashboard data', () => {
    dashboardService.getSummary.mockResolvedValue({
      monitors: { total: 1, up: 1, down: 0, unknown: 0 },
      activeIncidents: 0,
      averageResponseTimeMs: 120,
      recentChecks: [],
    });

    return request(app.getHttpServer())
      .get('/dashboard/summary')
      .expect(200)
      .expect({
        monitors: { total: 1, up: 1, down: 0, unknown: 0 },
        activeIncidents: 0,
        averageResponseTimeMs: 120,
        recentChecks: [],
      });
  });

  it('/monitors/:id/check-results (GET) returns bounded history', () => {
    dashboardService.getMonitorCheckResults.mockResolvedValue([
      { id: 'check-1' },
    ]);

    return request(app.getHttpServer())
      .get('/monitors/monitor-1/check-results?limit=10')
      .expect(200)
      .expect([{ id: 'check-1' }])
      .expect(() => {
        expect(dashboardService.getMonitorCheckResults).toHaveBeenCalledWith(
          'monitor-1',
          10,
        );
      });
  });

  it('/incidents (GET) rejects an invalid history limit', () => {
    return request(app.getHttpServer())
      .get('/incidents?limit=101')
      .expect(400)
      .expect(() => {
        expect(dashboardService.getIncidents).not.toHaveBeenCalled();
      });
  });

  it('/status (GET) returns public status data', () => {
    dashboardService.getPublicStatus.mockResolvedValue({
      title: 'PulseDock Status',
      description: null,
      status: 'operational',
      monitors: [],
      incidents: [],
    });

    return request(app.getHttpServer()).get('/status').expect(200).expect({
      title: 'PulseDock Status',
      description: null,
      status: 'operational',
      monitors: [],
      incidents: [],
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

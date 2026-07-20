import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

jest.mock('./../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {
    $connect = jest.fn();
    $disconnect = jest.fn();
  },
}));

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
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

  afterEach(async () => {
    await app.close();
  });
});

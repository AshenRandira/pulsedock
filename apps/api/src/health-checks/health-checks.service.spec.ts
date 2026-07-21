import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { HealthChecksService } from './health-checks.service';

type MonitorUpdateArgs = {
  data: {
    currentStatus: string;
    consecutiveFailures: number;
    lastCheckedAt: Date;
  };
};

describe('HealthChecksService', () => {
  const prisma = {
    $transaction: jest.fn(),
    monitor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    checkResult: {
      create: jest.fn(),
    },
    incident: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new HealthChecksService(prisma as unknown as PrismaService);
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  const getLatestMonitorUpdate = (): MonitorUpdateArgs => {
    const [[updateArgs]] = prisma.monitor.update.mock.calls.slice(
      -1,
    ) as unknown as [[MonitorUpdateArgs]];

    return updateArgs;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.monitor.findUnique.mockResolvedValue({
      id: 'monitor-1',
      url: 'https://api.example.com/health',
      expectedStatusCode: 200,
      currentStatus: 'UNKNOWN',
      consecutiveFailures: 0,
    });
    prisma.monitor.update.mockResolvedValue({ id: 'monitor-1' });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('records a successful check and updates the monitor timestamp', async () => {
    const checkResult = { id: 'check-1', success: true };
    fetchMock.mockResolvedValue({ status: 200 });
    prisma.checkResult.create.mockResolvedValue(checkResult);

    await expect(service.checkMonitor('monitor-1')).resolves.toEqual(
      checkResult,
    );

    const [[createArgs]] = prisma.checkResult.create.mock.calls as unknown as [
      [
        {
          data: {
            monitorId: string;
            statusCode?: number;
            responseTimeMs: number;
            success: boolean;
            errorMessage?: string;
            checkedAt: Date;
          };
        },
      ],
    ];

    expect(createArgs.data).toMatchObject({
      monitorId: 'monitor-1',
      statusCode: 200,
      success: true,
    });
    expect(createArgs.data.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(createArgs.data.checkedAt).toBeInstanceOf(Date);
    expect(prisma.monitor.update).toHaveBeenCalledTimes(1);
  });

  it('records an unexpected response status as a failed check', async () => {
    fetchMock.mockResolvedValue({ status: 503 });
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });

    await service.checkMonitor('monitor-1');

    const [[createArgs]] = prisma.checkResult.create.mock.calls as unknown as [
      [
        {
          data: {
            statusCode?: number;
            success: boolean;
            errorMessage?: string;
          };
        },
      ],
    ];

    expect(createArgs.data).toEqual(
      expect.objectContaining({
        statusCode: 503,
        success: false,
        errorMessage: 'Expected status 200, received 503',
      }),
    );
    const monitorUpdate = getLatestMonitorUpdate();
    expect(monitorUpdate.data.currentStatus).toBe('UNKNOWN');
    expect(monitorUpdate.data.consecutiveFailures).toBe(1);
  });

  it('records network errors as failed checks', async () => {
    fetchMock.mockRejectedValue(new Error('Connection refused'));
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });

    await service.checkMonitor('monitor-1');

    const [[createArgs]] = prisma.checkResult.create.mock.calls as unknown as [
      [
        {
          data: {
            statusCode?: number;
            success: boolean;
            errorMessage?: string;
          };
        },
      ],
    ];

    expect(createArgs.data).toEqual(
      expect.objectContaining({
        statusCode: undefined,
        success: false,
        errorMessage: 'Connection refused',
      }),
    );
  });

  it('records timeouts as failed checks', async () => {
    const timeoutError = new Error('The operation timed out');
    timeoutError.name = 'TimeoutError';
    fetchMock.mockRejectedValue(timeoutError);
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });

    await service.checkMonitor('monitor-1');

    const [[createArgs]] = prisma.checkResult.create.mock.calls as unknown as [
      [
        {
          data: {
            success: boolean;
            errorMessage?: string;
          };
        },
      ],
    ];

    expect(createArgs.data).toEqual(
      expect.objectContaining({
        success: false,
        errorMessage: 'Request timed out after 10000ms',
      }),
    );
  });

  it('opens one incident after a second consecutive failure', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 'monitor-1',
      url: 'https://api.example.com/health',
      expectedStatusCode: 200,
      currentStatus: 'UP',
      consecutiveFailures: 1,
    });
    fetchMock.mockResolvedValue({ status: 503 });
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });
    prisma.incident.findFirst.mockResolvedValue(null);
    prisma.incident.create.mockResolvedValue({ id: 'incident-1' });

    await service.checkMonitor('monitor-1');

    const monitorUpdate = getLatestMonitorUpdate();
    const [[incidentCreateArgs]] = prisma.incident.create.mock
      .calls as unknown as [[{ data: { monitorId: string; reason: string } }]];

    expect(monitorUpdate.data.currentStatus).toBe('DOWN');
    expect(monitorUpdate.data.consecutiveFailures).toBe(2);
    expect(incidentCreateArgs.data.monitorId).toBe('monitor-1');
    expect(incidentCreateArgs.data.reason).toBe(
      'Expected status 200, received 503',
    );
  });

  it('does not create duplicate incidents while a monitor stays down', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 'monitor-1',
      url: 'https://api.example.com/health',
      expectedStatusCode: 200,
      currentStatus: 'DOWN',
      consecutiveFailures: 2,
    });
    fetchMock.mockResolvedValue({ status: 503 });
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });
    prisma.incident.findFirst.mockResolvedValue({ id: 'incident-1' });

    await service.checkMonitor('monitor-1');

    expect(prisma.incident.create).not.toHaveBeenCalled();
    const monitorUpdate = getLatestMonitorUpdate();
    expect(monitorUpdate.data.currentStatus).toBe('DOWN');
    expect(monitorUpdate.data.consecutiveFailures).toBe(3);
  });

  it('resolves an open incident after recovery', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 'monitor-1',
      url: 'https://api.example.com/health',
      expectedStatusCode: 200,
      currentStatus: 'DOWN',
      consecutiveFailures: 2,
    });
    fetchMock.mockResolvedValue({ status: 200 });
    prisma.checkResult.create.mockResolvedValue({ id: 'check-1' });
    prisma.incident.updateMany.mockResolvedValue({ count: 1 });

    await service.checkMonitor('monitor-1');

    const monitorUpdate = getLatestMonitorUpdate();
    const [[incidentUpdateArgs]] = prisma.incident.updateMany.mock
      .calls as unknown as [
      [
        {
          where: { monitorId: string; status: string };
          data: { status: string; resolvedAt: Date };
        },
      ],
    ];

    expect(monitorUpdate.data.currentStatus).toBe('UP');
    expect(monitorUpdate.data.consecutiveFailures).toBe(0);
    expect(incidentUpdateArgs.where).toEqual({
      monitorId: 'monitor-1',
      status: 'OPEN',
    });
    expect(incidentUpdateArgs.data.status).toBe('RESOLVED');
    expect(incidentUpdateArgs.data.resolvedAt).toBeInstanceOf(Date);
  });

  it('reports a missing monitor', async () => {
    prisma.monitor.findUnique.mockResolvedValue(null);

    await expect(service.checkMonitor('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

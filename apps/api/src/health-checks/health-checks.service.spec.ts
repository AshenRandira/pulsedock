import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { HealthChecksService } from './health-checks.service';

describe('HealthChecksService', () => {
  const prisma = {
    monitor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    checkResult: {
      create: jest.fn(),
    },
  };
  const service = new HealthChecksService(prisma as unknown as PrismaService);
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    prisma.monitor.findUnique.mockResolvedValue({
      id: 'monitor-1',
      url: 'https://api.example.com/health',
      expectedStatusCode: 200,
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

  it('reports a missing monitor', async () => {
    prisma.monitor.findUnique.mockResolvedValue(null);

    await expect(service.checkMonitor('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { Logger } from '@nestjs/common';

jest.mock('../health-checks/health-checks.service', () => ({
  HealthChecksService: class HealthChecksService {},
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { HealthChecksService } from '../health-checks/health-checks.service';
import { PrismaService } from '../prisma/prisma.service';
import { MonitorSchedulerService } from './monitor-scheduler.service';

type FindDueMonitorsArgs = {
  where: {
    isActive: boolean;
    nextCheckAt: { lte: Date };
  };
};

type MonitorUpdateArgs = {
  where: { id: string };
  data: { nextCheckAt: Date };
};

describe('MonitorSchedulerService', () => {
  const prisma = {
    monitor: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const healthChecksService = {
    checkMonitor: jest.fn(),
  };
  const service = new MonitorSchedulerService(
    prisma as unknown as PrismaService,
    healthChecksService as unknown as HealthChecksService,
  );
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks active monitors that are due and advances their schedule', async () => {
    prisma.monitor.findMany.mockResolvedValue([
      { id: 'monitor-1', intervalMinutes: 5 },
      { id: 'monitor-2', intervalMinutes: 10 },
    ]);
    healthChecksService.checkMonitor.mockResolvedValue({ id: 'check-1' });
    prisma.monitor.update.mockResolvedValue({ id: 'monitor-1' });
    const startedAt = Date.now();

    await service.runDueChecks();

    const [[findArgs]] = prisma.monitor.findMany.mock.calls as unknown as [
      [FindDueMonitorsArgs],
    ];
    const updateCalls = prisma.monitor.update.mock.calls as unknown as [
      [MonitorUpdateArgs],
      [MonitorUpdateArgs],
    ];

    expect(findArgs.where.isActive).toBe(true);
    expect(findArgs.where.nextCheckAt.lte).toBeInstanceOf(Date);
    expect(healthChecksService.checkMonitor).toHaveBeenNthCalledWith(
      1,
      'monitor-1',
    );
    expect(healthChecksService.checkMonitor).toHaveBeenNthCalledWith(
      2,
      'monitor-2',
    );
    expect(updateCalls[0][0].where.id).toBe('monitor-1');
    expect(updateCalls[0][0].data.nextCheckAt.getTime()).toBeGreaterThanOrEqual(
      startedAt + 5 * 60_000,
    );
    expect(updateCalls[1][0].where.id).toBe('monitor-2');
    expect(updateCalls[1][0].data.nextCheckAt.getTime()).toBeGreaterThanOrEqual(
      startedAt + 10 * 60_000,
    );
  });

  it('continues with later monitors when one scheduled check throws', async () => {
    prisma.monitor.findMany.mockResolvedValue([
      { id: 'monitor-1', intervalMinutes: 5 },
      { id: 'monitor-2', intervalMinutes: 5 },
    ]);
    healthChecksService.checkMonitor
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValueOnce({ id: 'check-2' });
    prisma.monitor.update.mockResolvedValue({ id: 'monitor-2' });

    await service.runDueChecks();

    expect(healthChecksService.checkMonitor).toHaveBeenCalledTimes(2);
    expect(prisma.monitor.update).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('does not run checks when no monitors are due', async () => {
    prisma.monitor.findMany.mockResolvedValue([]);

    await service.runDueChecks();

    expect(healthChecksService.checkMonitor).not.toHaveBeenCalled();
    expect(prisma.monitor.update).not.toHaveBeenCalled();
  });
});

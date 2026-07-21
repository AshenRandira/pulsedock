import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { CheckHistoryCleanupService } from './check-history-cleanup.service';

describe('CheckHistoryCleanupService', () => {
  const prisma = { checkResult: { deleteMany: jest.fn() } };
  const configService = { get: jest.fn() };
  const service = new CheckHistoryCleanupService(
    prisma as unknown as PrismaService,
    configService as unknown as ConfigService,
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

  it('deletes check results older than the configured retention period', async () => {
    configService.get.mockReturnValue('14');
    prisma.checkResult.deleteMany.mockResolvedValue({ count: 3 });
    const startedAt = Date.now();

    await service.removeExpiredCheckResults();

    const [[query]] = prisma.checkResult.deleteMany.mock.calls as unknown as [
      [{ where: { checkedAt: { lt: Date } } }],
    ];
    expect(query.where.checkedAt.lt.getTime()).toBeLessThanOrEqual(
      startedAt - 14 * 24 * 60 * 60_000,
    );
  });

  it('defaults to 30 days for an invalid retention value', async () => {
    configService.get.mockReturnValue('invalid');
    prisma.checkResult.deleteMany.mockResolvedValue({ count: 0 });
    const startedAt = Date.now();

    await service.removeExpiredCheckResults();

    const [[query]] = prisma.checkResult.deleteMany.mock.calls as unknown as [
      [{ where: { checkedAt: { lt: Date } } }],
    ];
    expect(query.where.checkedAt.lt.getTime()).toBeLessThanOrEqual(
      startedAt - 30 * 24 * 60 * 60_000,
    );
  });

  it('logs cleanup failures without throwing', async () => {
    configService.get.mockReturnValue('30');
    prisma.checkResult.deleteMany.mockRejectedValue(
      new Error('Database unavailable'),
    );

    await expect(service.removeExpiredCheckResults()).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });
});

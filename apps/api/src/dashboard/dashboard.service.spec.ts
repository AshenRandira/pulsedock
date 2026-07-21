import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    monitor: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    incident: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    checkResult: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    appSetting: {
      findFirst: jest.fn(),
    },
  };
  const service = new DashboardService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.checkResult.groupBy.mockResolvedValue([]);
  });

  it('returns dashboard counts, average response time, and recent checks', async () => {
    prisma.monitor.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.incident.count.mockResolvedValue(1);
    prisma.checkResult.aggregate.mockResolvedValue({
      _avg: { responseTimeMs: 123.6 },
    });
    prisma.checkResult.findMany.mockResolvedValue([{ id: 'check-1' }]);

    await expect(service.getSummary()).resolves.toEqual({
      monitors: { total: 4, up: 2, down: 1, unknown: 1 },
      activeIncidents: 1,
      averageResponseTimeMs: 124,
      recentChecks: [{ id: 'check-1' }],
    });
    expect(prisma.checkResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('returns bounded check history for a monitor', async () => {
    prisma.monitor.findUnique.mockResolvedValue({ id: 'monitor-1' });
    prisma.checkResult.findMany.mockResolvedValue([]);

    await expect(
      service.getMonitorCheckResults('monitor-1', 10),
    ).resolves.toEqual([]);

    expect(prisma.checkResult.findMany).toHaveBeenCalledWith({
      where: { monitorId: 'monitor-1' },
      orderBy: { checkedAt: 'desc' },
      take: 10,
    });
  });

  it('reports missing monitors for history requests', async () => {
    prisma.monitor.findUnique.mockResolvedValue(null);

    await expect(service.getMonitorIncidents('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.incident.findMany).not.toHaveBeenCalled();
  });

  it('returns only public monitors and incidents on the status endpoint', async () => {
    prisma.appSetting.findFirst.mockResolvedValue({
      statusPageTitle: 'PulseDock Production',
      statusPageDescription: 'Current service availability',
    });
    prisma.monitor.findMany.mockResolvedValue([
      { id: 'monitor-1', currentStatus: 'UP' },
    ]);
    prisma.incident.findMany.mockResolvedValue([]);
    prisma.checkResult.groupBy.mockResolvedValue([
      { monitorId: 'monitor-1', success: true, _count: { _all: 99 } },
      { monitorId: 'monitor-1', success: false, _count: { _all: 1 } },
    ]);

    await expect(service.getPublicStatus()).resolves.toEqual({
      title: 'PulseDock Production',
      description: 'Current service availability',
      status: 'operational',
      monitors: [
        { id: 'monitor-1', currentStatus: 'UP', uptimePercentage: 99 },
      ],
      incidents: [],
    });

    const [[monitorQuery]] = prisma.monitor.findMany.mock.calls as unknown as [
      [{ where: { isPublic: boolean } }],
    ];
    const [[incidentQuery]] = prisma.incident.findMany.mock
      .calls as unknown as [
      [{ where: { status: string; monitor: { isPublic: boolean } } }],
    ];

    expect(monitorQuery.where.isPublic).toBe(true);
    expect(incidentQuery.where).toEqual({
      status: 'OPEN',
      monitor: { isPublic: true },
    });
    expect(prisma.checkResult.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['monitorId', 'success'],
        _count: { _all: true },
      }),
    );
  });

  it('marks public status as degraded when a public monitor is down', async () => {
    prisma.appSetting.findFirst.mockResolvedValue(null);
    prisma.monitor.findMany.mockResolvedValue([
      { id: 'monitor-1', currentStatus: 'DOWN' },
    ]);
    prisma.incident.findMany.mockResolvedValue([]);

    await expect(service.getPublicStatus()).resolves.toMatchObject({
      title: 'PulseDock Status',
      status: 'degraded',
    });
  });
});

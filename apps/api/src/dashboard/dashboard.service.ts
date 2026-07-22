import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const defaultHistoryLimit = 30;
const defaultIncidentLimit = 50;
const publicStatusUptimeWindowDays = 30;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalMonitors,
      upMonitors,
      downMonitors,
      unknownMonitors,
      activeIncidents,
      responseTimes,
      recentChecks,
    ] = await Promise.all([
      this.prisma.monitor.count(),
      this.prisma.monitor.count({ where: { currentStatus: 'UP' } }),
      this.prisma.monitor.count({ where: { currentStatus: 'DOWN' } }),
      this.prisma.monitor.count({ where: { currentStatus: 'UNKNOWN' } }),
      this.prisma.incident.count({ where: { status: 'OPEN' } }),
      this.prisma.checkResult.aggregate({
        where: { success: true },
        _avg: { responseTimeMs: true },
      }),
      this.prisma.checkResult.findMany({
        take: 10,
        orderBy: { checkedAt: 'desc' },
        include: {
          monitor: {
            select: { id: true, name: true, url: true, currentStatus: true },
          },
        },
      }),
    ]);

    return {
      monitors: {
        total: totalMonitors,
        up: upMonitors,
        down: downMonitors,
        unknown: unknownMonitors,
      },
      activeIncidents,
      averageResponseTimeMs:
        responseTimes._avg.responseTimeMs === null
          ? null
          : Math.round(responseTimes._avg.responseTimeMs),
      recentChecks,
    };
  }

  async getMonitorCheckResults(id: string, limit?: number) {
    await this.findMonitor(id);

    return this.prisma.checkResult.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take: limit ?? defaultHistoryLimit,
    });
  }

  async getMonitorIncidents(id: string, limit?: number) {
    await this.findMonitor(id);

    return this.prisma.incident.findMany({
      where: { monitorId: id },
      orderBy: { startedAt: 'desc' },
      take: limit ?? defaultHistoryLimit,
    });
  }

  getIncidents(limit?: number) {
    return this.prisma.incident.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit ?? defaultIncidentLimit,
      include: {
        monitor: {
          select: { id: true, name: true, url: true, currentStatus: true },
        },
      },
    });
  }

  async getPublicStatus() {
    const [settings, monitors, incidents] = await Promise.all([
      this.prisma.appSetting.findFirst({ orderBy: { createdAt: 'asc' } }),
      this.prisma.monitor.findMany({
        where: { isPublic: true, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          url: true,
          currentStatus: true,
          lastCheckedAt: true,
        },
      }),
      this.prisma.incident.findMany({
        where: {
          status: 'OPEN',
          monitor: { isPublic: true, isActive: true },
        },
        orderBy: { startedAt: 'desc' },
        include: {
          monitor: {
            select: { id: true, name: true, url: true, currentStatus: true },
          },
        },
      }),
    ]);
    const checkGroups = monitors.length
      ? await this.prisma.checkResult.groupBy({
          by: ['monitorId', 'success'],
          where: {
            monitorId: { in: monitors.map((monitor) => monitor.id) },
            checkedAt: {
              gte: new Date(
                Date.now() - publicStatusUptimeWindowDays * 24 * 60 * 60_000,
              ),
            },
          },
          _count: { _all: true },
        })
      : [];
    const uptimeByMonitor = new Map<
      string,
      { successful: number; total: number }
    >();

    for (const checkGroup of checkGroups) {
      const uptime = uptimeByMonitor.get(checkGroup.monitorId) ?? {
        successful: 0,
        total: 0,
      };
      uptime.total += checkGroup._count._all;
      if (checkGroup.success) {
        uptime.successful += checkGroup._count._all;
      }
      uptimeByMonitor.set(checkGroup.monitorId, uptime);
    }
    const monitorsWithUptime = monitors.map((monitor) => {
      const uptime = uptimeByMonitor.get(monitor.id);

      return {
        ...monitor,
        uptimePercentage:
          uptime && uptime.total > 0
            ? Math.round((uptime.successful / uptime.total) * 10_000) / 100
            : null,
      };
    });
    const hasDownMonitor = monitorsWithUptime.some(
      (monitor) => monitor.currentStatus === 'DOWN',
    );

    return {
      title: settings?.statusPageTitle ?? 'PulseDock Status',
      description: settings?.statusPageDescription ?? null,
      status:
        hasDownMonitor || incidents.length > 0 ? 'degraded' : 'operational',
      monitors: monitorsWithUptime,
      incidents,
    };
  }

  private async findMonitor(id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      throw new NotFoundException(`Monitor ${id} was not found`);
    }

    return monitor;
  }
}

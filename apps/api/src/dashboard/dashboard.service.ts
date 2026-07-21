import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const defaultHistoryLimit = 30;
const defaultIncidentLimit = 50;

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
        where: { isPublic: true },
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
        where: { status: 'OPEN', monitor: { isPublic: true } },
        orderBy: { startedAt: 'desc' },
        include: {
          monitor: {
            select: { id: true, name: true, url: true, currentStatus: true },
          },
        },
      }),
    ]);
    const hasDownMonitor = monitors.some(
      (monitor) => monitor.currentStatus === 'DOWN',
    );

    return {
      title: settings?.statusPageTitle ?? 'PulseDock Status',
      description: settings?.statusPageDescription ?? null,
      status:
        hasDownMonitor || incidents.length > 0 ? 'degraded' : 'operational',
      monitors,
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

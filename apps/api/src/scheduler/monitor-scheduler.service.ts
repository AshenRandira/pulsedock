import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthChecksService } from '../health-checks/health-checks.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitorSchedulerService {
  private readonly logger = new Logger(MonitorSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthChecksService: HealthChecksService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledChecks(): Promise<void> {
    await this.runDueChecks();
  }

  async runDueChecks(): Promise<void> {
    const now = new Date();
    const dueMonitors = await this.prisma.monitor.findMany({
      where: {
        isActive: true,
        nextCheckAt: { lte: now },
      },
    });

    for (const monitor of dueMonitors) {
      try {
        await this.healthChecksService.checkMonitor(monitor.id);
        await this.prisma.monitor.update({
          where: { id: monitor.id },
          data: {
            nextCheckAt: new Date(
              Date.now() + monitor.intervalMinutes * 60_000,
            ),
          },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Scheduled health check failed for monitor ${monitor.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}

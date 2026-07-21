import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';

const healthCheckTimeoutMs = 10_000;

@Injectable()
export class HealthChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async checkMonitor(id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      throw new NotFoundException(`Monitor ${id} was not found`);
    }

    const checkedAt = new Date();
    const startedAt = Date.now();
    let statusCode: number | undefined;
    let success = false;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(monitor.url, {
        signal: AbortSignal.timeout(healthCheckTimeoutMs),
      });
      statusCode = response.status;
      success = statusCode === monitor.expectedStatusCode;

      if (!success) {
        errorMessage = `Expected status ${monitor.expectedStatusCode}, received ${statusCode}`;
      }
    } catch (error: unknown) {
      errorMessage = this.getErrorMessage(error);
    }

    const outcome = await this.prisma.$transaction(async (transaction) => {
      let incidentOpened = false;
      let incidentResolved = false;
      const checkResult = await transaction.checkResult.create({
        data: {
          monitorId: monitor.id,
          statusCode,
          responseTimeMs: Date.now() - startedAt,
          success,
          errorMessage,
          checkedAt,
        },
      });

      if (success) {
        await transaction.monitor.update({
          where: { id: monitor.id },
          data: {
            currentStatus: 'UP',
            consecutiveFailures: 0,
            lastCheckedAt: checkedAt,
          },
        });

        if (monitor.currentStatus === 'DOWN') {
          const resolution = await transaction.incident.updateMany({
            where: { monitorId: monitor.id, status: 'OPEN' },
            data: { status: 'RESOLVED', resolvedAt: checkedAt },
          });
          incidentResolved = resolution.count > 0;
        }

        return { checkResult, incidentOpened, incidentResolved };
      }

      const consecutiveFailures = monitor.consecutiveFailures + 1;
      const currentStatus =
        consecutiveFailures >= 2 ? 'DOWN' : monitor.currentStatus;

      await transaction.monitor.update({
        where: { id: monitor.id },
        data: { currentStatus, consecutiveFailures, lastCheckedAt: checkedAt },
      });

      if (currentStatus === 'DOWN') {
        const openIncident = await transaction.incident.findFirst({
          where: { monitorId: monitor.id, status: 'OPEN' },
        });

        if (!openIncident) {
          await transaction.incident.create({
            data: {
              monitorId: monitor.id,
              reason: errorMessage ?? 'Health check failed',
              startedAt: checkedAt,
            },
          });
          incidentOpened = true;
        }
      }

      return { checkResult, incidentOpened, incidentResolved };
    });

    if (outcome.incidentOpened) {
      await this.alertsService.sendIncidentOpened({
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        occurredAt: checkedAt,
        reason: errorMessage,
      });
    }

    if (outcome.incidentResolved) {
      await this.alertsService.sendIncidentResolved({
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        occurredAt: checkedAt,
      });
    }

    return outcome.checkResult;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return `Request timed out after ${healthCheckTimeoutMs}ms`;
      }

      return error.message;
    }

    return 'Health check failed with an unknown error';
  }
}

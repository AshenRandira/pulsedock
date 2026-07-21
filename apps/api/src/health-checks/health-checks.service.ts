import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const healthCheckTimeoutMs = 10_000;

@Injectable()
export class HealthChecksService {
  constructor(private readonly prisma: PrismaService) {}

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

    const checkResult = await this.prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        statusCode,
        responseTimeMs: Date.now() - startedAt,
        success,
        errorMessage,
        checkedAt,
      },
    });

    await this.prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastCheckedAt: checkedAt },
    });

    return checkResult;
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

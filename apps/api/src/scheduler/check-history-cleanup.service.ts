import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const defaultRetentionDays = 30;

@Injectable()
export class CheckHistoryCleanupService {
  private readonly logger = new Logger(CheckHistoryCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 3 * * *')
  async removeExpiredCheckResults(): Promise<void> {
    const retentionDays = this.getRetentionDays();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000);

    try {
      const result = await this.prisma.checkResult.deleteMany({
        where: { checkedAt: { lt: cutoff } },
      });

      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} expired check results`);
      }
    } catch (error: unknown) {
      this.logger.error(
        'Expired check-result cleanup failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getRetentionDays(): number {
    const configuredDays = Number(
      this.configService.get<string>('CHECK_HISTORY_RETENTION_DAYS'),
    );

    return Number.isInteger(configuredDays) && configuredDays > 0
      ? configuredDays
      : defaultRetentionDays;
  }
}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthChecksModule } from '../health-checks/health-checks.module';
import { CheckHistoryCleanupService } from './check-history-cleanup.service';
import { MonitorSchedulerService } from './monitor-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), HealthChecksModule],
  providers: [MonitorSchedulerService, CheckHistoryCleanupService],
})
export class MonitorSchedulerModule {}

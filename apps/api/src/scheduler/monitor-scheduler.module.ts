import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthChecksModule } from '../health-checks/health-checks.module';
import { MonitorSchedulerService } from './monitor-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), HealthChecksModule],
  providers: [MonitorSchedulerService],
})
export class MonitorSchedulerModule {}

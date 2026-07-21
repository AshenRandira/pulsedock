import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { IncidentsController } from './incidents.controller';
import { MonitorHistoryController } from './monitor-history.controller';
import { PublicStatusController } from './public-status.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [
    DashboardController,
    IncidentsController,
    MonitorHistoryController,
    PublicStatusController,
  ],
  providers: [DashboardService],
})
export class DashboardModule {}

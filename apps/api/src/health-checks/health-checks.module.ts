import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { HealthChecksController } from './health-checks.controller';
import { HealthChecksService } from './health-checks.service';

@Module({
  imports: [AlertsModule],
  controllers: [HealthChecksController],
  providers: [HealthChecksService],
  exports: [HealthChecksService],
})
export class HealthChecksModule {}

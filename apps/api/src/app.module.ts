import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthChecksModule } from './health-checks/health-checks.module';
import { MonitorsModule } from './monitors/monitors.module';
import { PrismaModule } from './prisma/prisma.module';
import { MonitorSchedulerModule } from './scheduler/monitor-scheduler.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    DashboardModule,
    HealthChecksModule,
    MonitorsModule,
    MonitorSchedulerModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

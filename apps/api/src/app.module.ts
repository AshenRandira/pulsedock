import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthChecksModule } from './health-checks/health-checks.module';
import { MonitorsModule } from './monitors/monitors.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthChecksModule,
    MonitorsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

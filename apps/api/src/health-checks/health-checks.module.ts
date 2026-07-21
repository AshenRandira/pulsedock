import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { HealthChecksController } from './health-checks.controller';
import { HealthChecksService } from './health-checks.service';

@Module({
  imports: [MailModule],
  controllers: [HealthChecksController],
  providers: [HealthChecksService],
  exports: [HealthChecksService],
})
export class HealthChecksModule {}

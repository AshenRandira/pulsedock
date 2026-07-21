import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AlertsService } from './alerts.service';

@Module({
  imports: [MailModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

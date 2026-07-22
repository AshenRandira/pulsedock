import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { AlertProvider } from './alert-provider';
import { IncidentAlert } from './incident-alert';

const noOpAlertProvider: AlertProvider = {
  sendIncidentOpened: () => Promise.resolve(),
  sendIncidentResolved: () => Promise.resolve(),
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async sendIncidentOpened(alert: IncidentAlert): Promise<void> {
    await this.getProvider().sendIncidentOpened(alert);
  }

  async sendIncidentResolved(alert: IncidentAlert): Promise<void> {
    await this.getProvider().sendIncidentResolved(alert);
  }

  private getProvider(): AlertProvider {
    // SMTP credentials remain environment-only and are never read from AppSetting.
    const provider = this.configService
      .get<string>('ALERT_PROVIDER')
      ?.toLowerCase();

    if (!provider || provider === 'none') {
      return noOpAlertProvider;
    }

    if (provider === 'smtp') {
      return this.mailService;
    }

    this.logger.warn(
      `Unsupported alert provider "${provider}"; alerts are disabled`,
    );
    return noOpAlertProvider;
  }
}

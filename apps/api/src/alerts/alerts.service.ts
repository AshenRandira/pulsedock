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
    const provider = this.configService
      .get<string>('ALERT_PROVIDER')
      ?.toLowerCase();

    if (!provider || provider === 'smtp') {
      return this.mailService;
    }

    if (provider === 'none') {
      return noOpAlertProvider;
    }

    this.logger.warn(
      `Unsupported alert provider "${provider}"; alerts are disabled`,
    );
    return noOpAlertProvider;
  }
}

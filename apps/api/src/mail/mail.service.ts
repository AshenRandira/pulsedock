import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AlertProvider } from '../alerts/alert-provider';
import { IncidentAlert } from '../alerts/incident-alert';

type MailConfiguration = {
  alertEmail: string;
  fromEmail: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
};

@Injectable()
export class MailService implements AlertProvider {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendIncidentOpened(alert: IncidentAlert): Promise<void> {
    await this.sendAlert(
      `PulseDock alert: ${alert.monitorName} is down`,
      [
        `Monitor: ${alert.monitorName}`,
        `URL: ${alert.monitorUrl}`,
        `Detected: ${alert.occurredAt.toISOString()}`,
        `Reason: ${alert.reason ?? 'Health check failed'}`,
      ].join('\n'),
    );
  }

  async sendIncidentResolved(alert: IncidentAlert): Promise<void> {
    await this.sendAlert(
      `PulseDock recovery: ${alert.monitorName} is up`,
      [
        `Monitor: ${alert.monitorName}`,
        `URL: ${alert.monitorUrl}`,
        `Recovered: ${alert.occurredAt.toISOString()}`,
      ].join('\n'),
    );
  }

  private async sendAlert(subject: string, text: string): Promise<void> {
    const configuration = this.getConfiguration();

    if (!configuration) {
      this.logger.warn('Email alert skipped because SMTP is not configured');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth:
        configuration.user && configuration.password
          ? { user: configuration.user, pass: configuration.password }
          : undefined,
    });

    try {
      await transporter.sendMail({
        from: configuration.fromEmail,
        to: configuration.alertEmail,
        subject,
        text,
      });
    } catch (error: unknown) {
      this.logger.error(
        'Email alert could not be sent',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getConfiguration(): MailConfiguration | undefined {
    const alertEmail = this.configService.get<string>('ALERT_EMAIL');
    const host = this.configService.get<string>('SMTP_HOST');
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');

    if (!alertEmail || !host || !fromEmail) {
      return undefined;
    }

    const configuredPort = Number(this.configService.get<string>('SMTP_PORT'));

    return {
      alertEmail,
      fromEmail,
      host,
      port: Number.isInteger(configuredPort) ? configuredPort : 587,
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      user: this.configService.get<string>('SMTP_USER'),
      password: this.configService.get<string>('SMTP_PASSWORD'),
    };
  }
}

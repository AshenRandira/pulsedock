import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

type TransportCreateArgs = {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
};

type MailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

describe('MailService', () => {
  const configService = { get: jest.fn() };
  const sendMail = jest.fn();
  const createTransport = nodemailer.createTransport as unknown as jest.Mock;
  const service = new MailService(configService as unknown as ConfigService);
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a downtime alert with configured SMTP settings', async () => {
    const settings: Record<string, string | undefined> = {
      ALERT_EMAIL: 'alerts@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '2525',
      SMTP_SECURE: 'false',
      SMTP_USER: 'mailer',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'pulsedock@example.com',
    };
    configService.get.mockImplementation((key: string) => settings[key]);
    createTransport.mockReturnValue({ sendMail });
    sendMail.mockResolvedValue({ messageId: 'message-1' });

    await service.sendIncidentOpened({
      monitorName: 'PulseDock API',
      monitorUrl: 'https://api.example.com/health',
      occurredAt: new Date('2026-07-21T00:00:00.000Z'),
      reason: 'Expected status 200, received 503',
    });

    const [[transportArgs]] = createTransport.mock.calls as unknown as [
      [TransportCreateArgs],
    ];
    const [[message]] = sendMail.mock.calls as unknown as [[MailMessage]];

    expect(transportArgs).toEqual({
      host: 'smtp.example.com',
      port: 2525,
      secure: false,
      auth: { user: 'mailer', pass: 'secret' },
    });
    expect(message.from).toBe('pulsedock@example.com');
    expect(message.to).toBe('alerts@example.com');
    expect(message.subject).toBe('PulseDock alert: PulseDock API is down');
    expect(message.text).toContain('Expected status 200, received 503');
  });

  it('skips alerts when SMTP settings are incomplete', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(
      service.sendIncidentResolved({
        monitorName: 'PulseDock API',
        monitorUrl: 'https://api.example.com/health',
        occurredAt: new Date(),
      }),
    ).resolves.toBeUndefined();

    expect(createTransport).not.toHaveBeenCalled();
  });

  it('logs SMTP failures without throwing', async () => {
    const settings: Record<string, string | undefined> = {
      ALERT_EMAIL: 'alerts@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM_EMAIL: 'pulsedock@example.com',
    };
    configService.get.mockImplementation((key: string) => settings[key]);
    createTransport.mockReturnValue({ sendMail });
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.sendIncidentResolved({
        monitorName: 'PulseDock API',
        monitorUrl: 'https://api.example.com/health',
        occurredAt: new Date(),
      }),
    ).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });
});

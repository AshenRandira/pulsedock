import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('../mail/mail.service', () => ({
  MailService: class MailService {},
}));

import { MailService } from '../mail/mail.service';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  const configService = { get: jest.fn() };
  const mailService = {
    sendIncidentOpened: jest.fn(),
    sendIncidentResolved: jest.fn(),
  };
  const service = new AlertsService(
    configService as unknown as ConfigService,
    mailService as unknown as MailService,
  );
  const alert = {
    monitorName: 'PulseDock API',
    monitorUrl: 'https://api.example.com/health',
    occurredAt: new Date(),
  };
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses SMTP by default', async () => {
    configService.get.mockReturnValue(undefined);

    await service.sendIncidentOpened(alert);

    expect(mailService.sendIncidentOpened).toHaveBeenCalledWith(alert);
  });

  it('disables notifications when the provider is none', async () => {
    configService.get.mockReturnValue('none');

    await service.sendIncidentResolved(alert);

    expect(mailService.sendIncidentResolved).not.toHaveBeenCalled();
  });

  it('disables unsupported providers with a visible warning', async () => {
    configService.get.mockReturnValue('webhook');

    await service.sendIncidentOpened(alert);

    expect(mailService.sendIncidentOpened).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });
});

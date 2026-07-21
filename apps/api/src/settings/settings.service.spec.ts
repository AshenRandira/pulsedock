jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const prisma = {
    appSetting: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new SettingsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns status-page defaults before settings are saved', async () => {
    prisma.appSetting.findFirst.mockResolvedValue(null);

    await expect(service.getSettings()).resolves.toEqual({
      statusPageTitle: 'PulseDock Status',
      statusPageDescription: null,
    });
  });

  it('creates settings when no record exists', async () => {
    prisma.appSetting.findFirst.mockResolvedValue(null);
    prisma.appSetting.create.mockResolvedValue({
      statusPageTitle: 'Production status',
      statusPageDescription: 'Current service availability',
    });

    await expect(
      service.updateSettings({
        statusPageTitle: 'Production status',
        statusPageDescription: 'Current service availability',
      }),
    ).resolves.toEqual({
      statusPageTitle: 'Production status',
      statusPageDescription: 'Current service availability',
    });
  });

  it('updates the existing settings record', async () => {
    prisma.appSetting.findFirst.mockResolvedValue({ id: 'settings-1' });
    prisma.appSetting.update.mockResolvedValue({
      statusPageTitle: 'PulseDock Status',
      statusPageDescription: 'Updated description',
    });

    await service.updateSettings({
      statusPageDescription: 'Updated description',
    });

    expect(prisma.appSetting.update).toHaveBeenCalledWith({
      where: { id: 'settings-1' },
      data: { statusPageDescription: 'Updated description' },
    });
  });
});

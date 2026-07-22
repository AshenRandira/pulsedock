import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const defaultSettings = {
  statusPageTitle: 'PulseDock Status',
  statusPageDescription: null,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.appSetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    return settings
      ? {
          statusPageTitle: settings.statusPageTitle,
          statusPageDescription: settings.statusPageDescription,
        }
      : defaultSettings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    const settings = await this.prisma.appSetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (settings) {
      const updatedSettings = await this.prisma.appSetting.update({
        where: { id: settings.id },
        data: updateSettingsDto,
      });

      return this.toPublicSettings(updatedSettings);
    }

    const createdSettings = await this.prisma.appSetting.create({
      data: {
        statusPageTitle:
          updateSettingsDto.statusPageTitle ?? defaultSettings.statusPageTitle,
        statusPageDescription: updateSettingsDto.statusPageDescription,
      },
    });

    return this.toPublicSettings(createdSettings);
  }

  private toPublicSettings(settings: {
    statusPageTitle: string;
    statusPageDescription: string | null;
  }) {
    return {
      statusPageTitle: settings.statusPageTitle,
      statusPageDescription: settings.statusPageDescription,
    };
  }
}

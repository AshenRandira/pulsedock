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
      return this.prisma.appSetting.update({
        where: { id: settings.id },
        data: updateSettingsDto,
      });
    }

    return this.prisma.appSetting.create({
      data: {
        statusPageTitle:
          updateSettingsDto.statusPageTitle ?? defaultSettings.statusPageTitle,
        statusPageDescription: updateSettingsDto.statusPageDescription,
      },
    });
  }
}

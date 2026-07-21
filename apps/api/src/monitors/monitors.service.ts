import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';

@Injectable()
export class MonitorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMonitorDto: CreateMonitorDto) {
    return this.prisma.monitor.create({
      data: {
        ...createMonitorDto,
        nextCheckAt: new Date(),
      },
    });
  }

  findAll() {
    return this.prisma.monitor.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      throw new NotFoundException(`Monitor ${id} was not found`);
    }

    return monitor;
  }

  async update(id: string, updateMonitorDto: UpdateMonitorDto) {
    await this.findOne(id);

    return this.prisma.monitor.update({
      where: { id },
      data: updateMonitorDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.monitor.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

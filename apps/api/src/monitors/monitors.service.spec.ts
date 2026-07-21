import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { MonitorsService } from './monitors.service';

describe('MonitorsService', () => {
  const prisma = {
    monitor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new MonitorsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a monitor that is ready for its first check', async () => {
    const monitor = { id: 'monitor-1', name: 'PulseDock API' };
    prisma.monitor.create.mockResolvedValue(monitor);

    await expect(
      service.create({
        name: 'PulseDock API',
        url: 'https://api.example.com/health',
        intervalMinutes: 5,
      }),
    ).resolves.toEqual(monitor);

    const [[createArgs]] = prisma.monitor.create.mock.calls as unknown as [
      [
        {
          data: {
            name: string;
            url: string;
            intervalMinutes: number;
            nextCheckAt: Date;
          };
        },
      ],
    ];

    expect(createArgs.data).toMatchObject({
      name: 'PulseDock API',
      url: 'https://api.example.com/health',
      intervalMinutes: 5,
    });
    expect(createArgs.data.nextCheckAt).toBeInstanceOf(Date);
  });

  it('lists monitors newest first', async () => {
    prisma.monitor.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(prisma.monitor.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('reports a missing monitor', async () => {
    prisma.monitor.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an existing monitor', async () => {
    const monitor = { id: 'monitor-1', name: 'Original' };
    prisma.monitor.findUnique.mockResolvedValue(monitor);
    prisma.monitor.update.mockResolvedValue({ ...monitor, name: 'Updated' });

    await expect(
      service.update('monitor-1', { name: 'Updated' }),
    ).resolves.toEqual({ ...monitor, name: 'Updated' });
    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 'monitor-1' },
      data: { name: 'Updated' },
    });
  });

  it('soft deletes an existing monitor', async () => {
    prisma.monitor.findUnique.mockResolvedValue({ id: 'monitor-1' });
    prisma.monitor.update.mockResolvedValue({
      id: 'monitor-1',
      isActive: false,
    });

    await expect(service.remove('monitor-1')).resolves.toEqual({
      id: 'monitor-1',
      isActive: false,
    });
    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 'monitor-1' },
      data: { isActive: false },
    });
  });
});

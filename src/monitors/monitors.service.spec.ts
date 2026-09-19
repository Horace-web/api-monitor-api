import { MonitorsService } from './monitors.service';

describe('MonitorsService', () => {
  const prisma = {
    monitor: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    service: { findFirst: jest.fn() },
  } as any;
  let service: MonitorsService;
  const user = { id: 'user-1', email: 'user@example.com' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MonitorsService(prisma);
  });

  it('findAll returns the latest check as latestCheck', async () => {
    prisma.monitor.findMany.mockResolvedValue([{
      id: 'monitor-1',
      name: 'API',
      checkResults: [{ id: 'check-1', monitorId: 'monitor-1', status: 'UP', statusCode: 200, responseTime: 120, error: null, checkedAt: new Date() }],
    }]);
    prisma.monitor.count.mockResolvedValue(1);

    const result = await service.findAll(user, { page: 1, limit: 10 });
    expect(result.data[0].latestCheck).toEqual(expect.objectContaining({ id: 'check-1', status: 'UP' }));
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(prisma.monitor.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { service: { userId: 'user-1' } },
      skip: 0,
      take: 10,
    }));
  });

  it('findOne returns null for a monitor belonging to another user', async () => {
    prisma.monitor.findFirst.mockResolvedValue(null);
    await expect(service.findOne('monitor-1', user)).resolves.toBeNull();
    expect(prisma.monitor.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'monitor-1', service: { userId: 'user-1' } },
    }));
  });

  it('creates a monitor only when its service belongs to the user', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 'service-1', userId: 'user-1' });
    prisma.monitor.create.mockResolvedValue({ id: 'monitor-1', serviceId: 'service-1', interval: 300 });

    await expect(service.create(user, {
      serviceId: 'service-1', name: 'API', url: 'https://example.com',
    })).resolves.toEqual({ id: 'monitor-1', serviceId: 'service-1', interval: 300 });

    expect(prisma.monitor.create).toHaveBeenCalledWith({
      data: {
        name: 'API', url: 'https://example.com', serviceId: 'service-1',
        timeout: 10000, expectedStatus: 200, interval: 300,
      },
    });
  });

  it('does not delete an inaccessible monitor', async () => {
    prisma.monitor.findFirst.mockResolvedValue(null);
    await expect(service.remove('monitor-1', user)).resolves.toBeNull();
    expect(prisma.monitor.delete).not.toHaveBeenCalled();
  });
});

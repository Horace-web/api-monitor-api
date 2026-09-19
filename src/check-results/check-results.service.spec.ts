import { CheckResultsService } from './check-results.service';

describe('CheckResultsService', () => {
  const prisma = {
    monitor: { findFirst: jest.fn() },
    checkResult: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  } as any;
  let service: CheckResultsService;
  const user = { id: 'user-1', email: 'user@example.com' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CheckResultsService(prisma);
  });

  it('returns paginated results for an owned monitor', async () => {
    prisma.monitor.findFirst.mockResolvedValue({ id: 'monitor-1' });
    prisma.checkResult.findMany.mockResolvedValue([{ id: 'check-1', status: 'UP' }]);
    prisma.checkResult.count.mockResolvedValue(1);

    await expect(service.findByMonitor('monitor-1', user, { page: 2, limit: 10, status: 'UP' })).resolves.toEqual({
      data: [{ id: 'check-1', status: 'UP' }],
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });

    expect(prisma.checkResult.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { monitorId: 'monitor-1', status: 'UP' },
      skip: 10,
      take: 10,
    }));
  });

  it('returns null for a monitor not owned by the user', async () => {
    prisma.monitor.findFirst.mockResolvedValue(null);
    await expect(service.findByMonitor('monitor-1', user)).resolves.toBeNull();
    expect(prisma.checkResult.findMany).not.toHaveBeenCalled();
  });

  it('calculates uptime and average response time', async () => {
    prisma.monitor.findFirst.mockResolvedValue({ id: 'monitor-1' });
    prisma.checkResult.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.status === 'UP' ? 8 : 10),
    );
    prisma.checkResult.aggregate.mockResolvedValue({ _avg: { responseTime: 123.7 } });

    await expect(service.getStats('monitor-1', user)).resolves.toEqual({
      totalChecks: 10,
      successfulChecks: 8,
      failedChecks: 2,
      uptimePercentage: 80,
      averageResponseTime: 124,
    });
  });

  it('returns null stats for a monitor not owned by the user', async () => {
    prisma.monitor.findFirst.mockResolvedValue(null);
    await expect(service.getStats('monitor-1', user)).resolves.toBeNull();
    expect(prisma.checkResult.count).not.toHaveBeenCalled();
  });
});

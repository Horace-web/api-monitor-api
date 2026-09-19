import { ServicesService } from './services.service';

describe('ServicesService', () => {
  const prisma = {
    user: { upsert: jest.fn() },
    service: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
  } as any;
  let service: ServicesService;
  const user = { id: 'user-1', email: 'user@example.com' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServicesService(prisma);
  });

  it('findAll scopes results to the authenticated user and returns pagination metadata', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: 'service-1', name: 'API', _count: { monitors: 2 } }]);
    prisma.service.count.mockResolvedValue(1);

    await expect(service.findAll(user, { page: 2, limit: 5, search: ' api ' })).resolves.toEqual({
      data: [{ id: 'service-1', name: 'API', _count: { monitors: 2 } }],
      meta: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });

    expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-1',
        OR: [
          { name: { contains: 'api', mode: 'insensitive' } },
          { description: { contains: 'api', mode: 'insensitive' } },
        ],
      }),
      skip: 5,
      take: 5,
    }));
  });

  it('returns only a service owned by the user', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 'service-1', userId: 'user-1', monitors: [] });
    await expect(service.findOne('service-1', user)).resolves.toEqual({
      id: 'service-1', userId: 'user-1', monitors: [],
    });
    expect(prisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: 'service-1', userId: 'user-1' },
      include: { monitors: true },
    });
  });

  it('upserts the user before creating a service', async () => {
    prisma.user.upsert.mockResolvedValue({});
    prisma.service.create.mockResolvedValue({ id: 'service-1', name: 'API', userId: 'user-1' });

    await expect(service.create(user, { name: 'API', description: 'Main API' })).resolves.toEqual({
      id: 'service-1', name: 'API', userId: 'user-1',
    });

    expect(prisma.user.upsert).toHaveBeenCalled();
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: { name: 'API', description: 'Main API', userId: 'user-1' },
    });
  });

  it('does not delete a service that is not owned by the user', async () => {
    prisma.service.findFirst.mockResolvedValue(null);
    await expect(service.remove('service-1', user)).resolves.toBeNull();
    expect(prisma.service.delete).not.toHaveBeenCalled();
  });
});

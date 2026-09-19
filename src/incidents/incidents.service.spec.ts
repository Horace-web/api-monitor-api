import { IncidentsService } from './incidents.service';

describe('IncidentsService', () => {
  const prisma = {
    incident: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    checkResult: { findMany: jest.fn(), count: jest.fn() },
  } as any;
  const notifications = {
    sendIncidentEmail: jest.fn(),
    sendRecoveryEmail: jest.fn(),
  } as any;
  let service: IncidentsService;

  const input = {
    monitorId: 'monitor-1', userId: 'user-1', email: 'user@example.com',
    monitorName: 'API', url: 'https://example.com', error: 'HTTP 500', statusCode: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentsService(prisma, notifications);
  });

  it('creates an incident and sends one notification when no incident is open', async () => {
    const startedAt = new Date('2026-09-19T00:00:00.000Z');
    prisma.incident.findFirst.mockResolvedValue(null);
    prisma.incident.create.mockResolvedValue({ id: 'incident-1', startedAt });

    await service.handleDown(input);

    expect(prisma.incident.create).toHaveBeenCalledWith({
      data: {
        monitorId: 'monitor-1', userId: 'user-1', status: 'OPEN', lastError: 'HTTP 500',
      },
    });
    expect(notifications.sendIncidentEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com', monitorName: 'API', statusCode: 500, startedAt,
    }));
  });

  it('does not create or notify a duplicate while an incident is open', async () => {
    prisma.incident.findFirst.mockResolvedValue({ id: 'incident-1', startedAt: new Date() });

    await service.handleDown(input);

    expect(prisma.incident.create).not.toHaveBeenCalled();
    expect(notifications.sendIncidentEmail).not.toHaveBeenCalled();
    expect(prisma.incident.update).toHaveBeenCalledWith({
      where: { id: 'incident-1' },
      data: { lastError: 'HTTP 500' },
    });
  });

  it('resolves the open incident and sends a recovery notification', async () => {
    const incident = { id: 'incident-1', startedAt: new Date('2026-09-19T00:00:00.000Z') };
    prisma.incident.findFirst.mockResolvedValue(incident);

    await service.handleUp({
      monitorId: 'monitor-1', userId: 'user-1', email: 'user@example.com',
      monitorName: 'API', url: 'https://example.com',
    });

    expect(prisma.incident.update).toHaveBeenCalledWith({
      where: { id: 'incident-1' },
      data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
    });
    expect(notifications.sendRecoveryEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com', monitorName: 'API', url: 'https://example.com',
      resolvedAt: expect.any(Date),
    }));
  });

  it('does nothing on recovery when there is no open incident', async () => {
    prisma.incident.findFirst.mockResolvedValue(null);

    await service.handleUp({
      monitorId: 'monitor-1', userId: 'user-1', email: 'user@example.com',
      monitorName: 'API', url: 'https://example.com',
    });

    expect(prisma.incident.update).not.toHaveBeenCalled();
    expect(notifications.sendRecoveryEmail).not.toHaveBeenCalled();
  });
});

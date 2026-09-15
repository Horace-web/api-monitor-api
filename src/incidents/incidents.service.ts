import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { NotificationService } from './notification.service';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async findAlerts(user: SupabaseUser, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = { status: 'DOWN' as const, monitor: { service: { userId: user.id } } };
    const [data, total] = await Promise.all([
      this.prisma.checkResult.findMany({
        where,
        orderBy: { checkedAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          monitorId: true,
          statusCode: true,
          responseTime: true,
          error: true,
          checkedAt: true,
          monitor: { select: { name: true, url: true, service: { select: { name: true } } } },
        },
      }),
      this.prisma.checkResult.count({ where }),
    ]);
    return { data, meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async handleDown(input: {
    monitorId: string;
    userId: string;
    email: string;
    monitorName: string;
    url: string;
    error?: string | null;
    statusCode?: number | null;
  }): Promise<void> {
    const existing = await this.prisma.incident.findFirst({
      where: { monitorId: input.monitorId, userId: input.userId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      await this.prisma.incident.update({ where: { id: existing.id }, data: { lastError: input.error ?? null } });
      return;
    }

    const incident = await this.prisma.incident.create({
      data: {
        monitorId: input.monitorId,
        userId: input.userId,
        status: 'OPEN',
        lastError: input.error ?? null,
      },
    });

    await this.notifications.sendIncidentEmail({
      to: input.email,
      monitorName: input.monitorName,
      url: input.url,
      error: input.error,
      statusCode: input.statusCode,
      startedAt: incident.startedAt,
    });
  }

  async handleUp(input: {
    monitorId: string;
    userId: string;
    email: string;
    monitorName: string;
    url: string;
  }): Promise<void> {
    const incident = await this.prisma.incident.findFirst({
      where: { monitorId: input.monitorId, userId: input.userId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });

    if (!incident) return;

    const resolvedAt = new Date();
    await this.prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'RESOLVED', resolvedAt },
    });

    await this.notifications.sendRecoveryEmail({
      to: input.email,
      monitorName: input.monitorName,
      url: input.url,
      resolvedAt,
    });
  }
}

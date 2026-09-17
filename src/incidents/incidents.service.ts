import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { NotificationService } from './notification.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

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
    this.logger.log(
      `DOWN incident processing started: monitor=${input.monitorId}, statusCode=${input.statusCode ?? 'none'}, error=${input.error ?? 'none'}`,
    );

    const existing = await this.prisma.incident.findFirst({
      where: { monitorId: input.monitorId, userId: input.userId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      this.logger.warn(
        `Existing OPEN incident found: incident=${existing.id}, monitor=${input.monitorId}, startedAt=${existing.startedAt.toISOString()}. Notification will not be sent.`,
      );
      await this.prisma.incident.update({ where: { id: existing.id }, data: { lastError: input.error ?? null } });
      return;
    }

    this.logger.log(`No OPEN incident found for monitor=${input.monitorId}. Creating a new incident.`);

    const incident = await this.prisma.incident.create({
      data: {
        monitorId: input.monitorId,
        userId: input.userId,
        status: 'OPEN',
        lastError: input.error ?? null,
      },
    });

    this.logger.log(
      `Incident created: incident=${incident.id}, monitor=${input.monitorId}, startedAt=${incident.startedAt.toISOString()}. Sending incident notification.`,
    );

    await this.notifications.sendIncidentEmail({
      to: input.email,
      monitorName: input.monitorName,
      url: input.url,
      error: input.error,
      statusCode: input.statusCode,
      startedAt: incident.startedAt,
    });

    this.logger.log(`DOWN incident processing finished: incident=${incident.id}, monitor=${input.monitorId}.`);
  }

  async handleUp(input: {
    monitorId: string;
    userId: string;
    email: string;
    monitorName: string;
    url: string;
  }): Promise<void> {
    this.logger.log(`UP incident recovery processing started: monitor=${input.monitorId}.`);

    const incident = await this.prisma.incident.findFirst({
      where: { monitorId: input.monitorId, userId: input.userId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });

    if (!incident) {
      this.logger.log(`No OPEN incident found during recovery: monitor=${input.monitorId}. No recovery notification needed.`);
      return;
    }

    const resolvedAt = new Date();
    await this.prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'RESOLVED', resolvedAt },
    });

    this.logger.log(
      `Incident resolved: incident=${incident.id}, monitor=${input.monitorId}, resolvedAt=${resolvedAt.toISOString()}. Sending recovery notification.`,
    );

    await this.notifications.sendRecoveryEmail({
      to: input.email,
      monitorName: input.monitorName,
      url: input.url,
      resolvedAt,
    });

    this.logger.log(`UP incident recovery processing finished: incident=${incident.id}, monitor=${input.monitorId}.`);
  }
}

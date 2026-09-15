import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class CheckResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMonitor(
    monitorId: string,
    user: SupabaseUser,
    options: { page?: number; limit?: number; from?: string; to?: string; status?: 'UP' | 'DOWN' } = {},
  ) {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const monitor = await this.prisma.monitor.findFirst({ where: { id: monitorId, service: { userId: user.id } }, select: { id: true } });
    if (!monitor) return null;

    const checkedAt: { gte?: Date; lte?: Date } = {};
    if (options.from) checkedAt.gte = new Date(options.from);
    if (options.to) checkedAt.lte = new Date(options.to);
    const where = { monitorId, ...(options.status ? { status: options.status } : {}), ...(Object.keys(checkedAt).length ? { checkedAt } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.checkResult.findMany({ where, orderBy: { checkedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.checkResult.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getStats(monitorId: string, user: SupabaseUser) {
    const monitor = await this.prisma.monitor.findFirst({ where: { id: monitorId, service: { userId: user.id } }, select: { id: true } });
    if (!monitor) return null;
    const [totalChecks, successfulChecks, responseStats] = await Promise.all([
      this.prisma.checkResult.count({ where: { monitorId } }),
      this.prisma.checkResult.count({ where: { monitorId, status: 'UP' } }),
      this.prisma.checkResult.aggregate({ where: { monitorId }, _avg: { responseTime: true } }),
    ]);
    return {
      totalChecks,
      successfulChecks,
      failedChecks: totalChecks - successfulChecks,
      uptimePercentage: totalChecks === 0 ? null : Number(((successfulChecks / totalChecks) * 100).toFixed(2)),
      averageResponseTime: responseStats._avg.responseTime === null ? null : Math.round(responseStats._avg.responseTime),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: SupabaseUser) {
    const [services, activeMonitors, totalMonitors, checkSummary, responseStats, recentDown] =
      await Promise.all([
        this.prisma.service.count({ where: { userId: user.id } }),
        this.prisma.monitor.count({ where: { service: { userId: user.id }, isActive: true } }),
        this.prisma.monitor.count({ where: { service: { userId: user.id } } }),
        this.prisma.checkResult.groupBy({
          by: ['status'],
          where: { monitor: { service: { userId: user.id } } },
          _count: { _all: true },
        }),
        this.prisma.checkResult.aggregate({
          where: { monitor: { service: { userId: user.id } } },
          _avg: { responseTime: true },
        }),
        this.prisma.checkResult.findMany({
          where: {
            status: 'DOWN',
            monitor: { service: { userId: user.id } },
          },
          orderBy: { checkedAt: 'desc' },
          take: 5,
          select: {
            monitorId: true,
            statusCode: true,
            error: true,
            checkedAt: true,
            monitor: { select: { name: true, service: { select: { name: true } } } },
          },
        }),
      ]);

    const successfulChecks = checkSummary.find((item) => item.status === 'UP')?._count._all ?? 0;
    const failedChecks = checkSummary.find((item) => item.status === 'DOWN')?._count._all ?? 0;
    const totalChecks = successfulChecks + failedChecks;

    return {
      services,
      activeMonitors,
      pausedMonitors: totalMonitors - activeMonitors,
      totalMonitors,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercentage:
        totalChecks === 0 ? null : Number(((successfulChecks / totalChecks) * 100).toFixed(2)),
      averageResponseTime:
        responseStats._avg.responseTime === null ? null : Math.round(responseStats._avg.responseTime),
      recentDown,
    };
  }
}

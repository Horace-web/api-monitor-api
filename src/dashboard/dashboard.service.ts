import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: SupabaseUser) {
    const [services, activeMonitors, totalMonitors, checkSummary, responseStats] = await Promise.all([
      this.prisma.service.count({ where: { userId: user.id } }),
      this.prisma.monitor.count({ where: { service: { userId: user.id }, isActive: true } }),
      this.prisma.monitor.count({ where: { service: { userId: user.id } } }),
      this.prisma.checkResult.groupBy({ by: ['status'], where: { monitor: { service: { userId: user.id } } }, _count: { _all: true } }),
      this.prisma.checkResult.aggregate({ where: { monitor: { service: { userId: user.id } } }, _avg: { responseTime: true } }),
    ]);

    const successfulChecks = checkSummary.find((item) => item.status === 'UP')?._count._all ?? 0;
    const failedChecks = checkSummary.find((item) => item.status === 'DOWN')?._count._all ?? 0;
    const totalChecks = successfulChecks + failedChecks;

    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() - 24);
    const recentChecks = await this.prisma.checkResult.findMany({
      where: { monitor: { service: { userId: user.id } }, checkedAt: { gte: start } },
      select: { status: true, responseTime: true, checkedAt: true },
      orderBy: { checkedAt: 'asc' },
    });

    const trend = Array.from({ length: 24 }, (_, index) => {
      const bucketStart = new Date(start); bucketStart.setMinutes(0, 0, 0); bucketStart.setHours(bucketStart.getHours() + index);
      const bucketEnd = new Date(bucketStart); bucketEnd.setHours(bucketEnd.getHours() + 1);
      const bucket = recentChecks.filter((check) => check.checkedAt >= bucketStart && check.checkedAt < bucketEnd);
      const up = bucket.filter((check) => check.status === 'UP').length;
      const down = bucket.length - up;
      const responseTimes = bucket.map((check) => check.responseTime).filter((value): value is number => value !== null);
      return { time: bucketStart.toISOString(), checks: bucket.length, up, down, averageResponseTime: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null };
    });

    return {
      services,
      activeMonitors,
      pausedMonitors: totalMonitors - activeMonitors,
      totalMonitors,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercentage: totalChecks === 0 ? null : Number(((successfulChecks / totalChecks) * 100).toFixed(2)),
      averageResponseTime: responseStats._avg.responseTime === null ? null : Math.round(responseStats._avg.responseTime),
      trend,
    };
  }
}

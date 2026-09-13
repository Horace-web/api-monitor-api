import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class CheckResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMonitor(
    monitorId: string,
    user: SupabaseUser,
    limit = 100,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 500);

    const monitor = await this.prisma.monitor.findFirst({
      where: {
        id: monitorId,
        service: { userId: user.id },
      },
      select: { id: true },
    });

    if (!monitor) return null;

    return this.prisma.checkResult.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: safeLimit,
    });
  }

  async getStats(monitorId: string, user: SupabaseUser) {
    const monitor = await this.prisma.monitor.findFirst({
      where: {
        id: monitorId,
        service: { userId: user.id },
      },
      select: { id: true },
    });

    if (!monitor) return null;

    const [totalChecks, successfulChecks, responseStats] = await Promise.all([
      this.prisma.checkResult.count({ where: { monitorId } }),
      this.prisma.checkResult.count({
        where: { monitorId, status: 'UP' },
      }),
      this.prisma.checkResult.aggregate({
        where: { monitorId },
        _avg: { responseTime: true },
      }),
    ]);

    return {
      totalChecks,
      successfulChecks,
      failedChecks: totalChecks - successfulChecks,
      uptimePercentage:
        totalChecks === 0
          ? null
          : Number(((successfulChecks / totalChecks) * 100).toFixed(2)),
      averageResponseTime:
        responseStats._avg.responseTime === null
          ? null
          : Math.round(responseStats._avg.responseTime),
    };
  }
}

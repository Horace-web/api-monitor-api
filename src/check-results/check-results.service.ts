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

    const results = await this.prisma.checkResult.findMany({
      where: { monitorId },
      select: { status: true, responseTime: true },
    });

    const total = results.length;
    const successful = results.filter((result) => result.status === 'UP').length;
    const responseTimes = results
      .map((result) => result.responseTime)
      .filter((value): value is number => value !== null);

    return {
      totalChecks: total,
      successfulChecks: successful,
      failedChecks: total - successful,
      uptimePercentage: total === 0 ? null : Number(((successful / total) * 100).toFixed(2)),
      averageResponseTime:
        responseTimes.length === 0
          ? null
          : Math.round(
              responseTimes.reduce((sum, value) => sum + value, 0) /
                responseTimes.length,
            ),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAlerts(user: SupabaseUser, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = { status: 'DOWN' as const, monitor: { service: { userId: user.id } } };
    const [data, total] = await Promise.all([
      this.prisma.checkResult.findMany({ where, orderBy: { checkedAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit, select: { id: true, monitorId: true, statusCode: true, responseTime: true, error: true, checkedAt: true, monitor: { select: { name: true, url: true, service: { select: { name: true } } } } } }),
      this.prisma.checkResult.count({ where }),
    ]);
    return { data, meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }
}

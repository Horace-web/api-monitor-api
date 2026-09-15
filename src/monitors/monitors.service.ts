import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class MonitorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: SupabaseUser, options: { serviceId?: string; status?: 'UP' | 'DOWN' | 'PAUSED'; search?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(options.page ?? 1, 1); const limit = Math.min(Math.max(options.limit ?? 10, 1), 50); const search = options.search?.trim();
    const where = { service: { userId: user.id, ...(options.serviceId ? { id: options.serviceId } : {}) }, ...(options.status === 'PAUSED' ? { isActive: false } : options.status ? { isActive: true, checkResults: { some: { status: options.status } } } : {}), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { url: { contains: search, mode: 'insensitive' as const } }] } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.monitor.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { checkResults: { orderBy: { checkedAt: 'desc' }, take: 1, select: { id: true, monitorId: true, status: true, statusCode: true, responseTime: true, error: true, checkedAt: true } } } }),
      this.prisma.monitor.count({ where }),
    ]);
    return { data: data.map(({ checkResults, ...monitor }) => ({ ...monitor, latestCheck: checkResults[0] ?? null })), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: SupabaseUser) {
    const monitor = await this.prisma.monitor.findFirst({ where: { id, service: { userId: user.id } }, include: { service: { select: { id: true, name: true, description: true } }, checkResults: { orderBy: { checkedAt: 'desc' }, take: 1, select: { id: true, monitorId: true, status: true, statusCode: true, responseTime: true, error: true, checkedAt: true } } } });
    if (!monitor) return null;
    const { checkResults, ...rest } = monitor; return { ...rest, latestCheck: checkResults[0] ?? null };
  }

  async create(user: SupabaseUser, data: { serviceId: string; name: string; url: string; timeout?: number; expectedStatus?: number; interval?: number }) {
    const service = await this.prisma.service.findFirst({ where: { id: data.serviceId, userId: user.id } }); if (!service) return null;
    return this.prisma.monitor.create({ data: { name: data.name, url: data.url, serviceId: data.serviceId, timeout: data.timeout ?? 10000, expectedStatus: data.expectedStatus ?? 200, interval: data.interval ?? 60 } });
  }
  async updateStatus(id: string, user: SupabaseUser, isActive: boolean) { const monitor = await this.findOne(id, user); if (!monitor) return null; return this.prisma.monitor.update({ where: { id }, data: { isActive } }); }
  async remove(id: string, user: SupabaseUser) { const monitor = await this.findOne(id, user); if (!monitor) return null; return this.prisma.monitor.delete({ where: { id } }); }
}

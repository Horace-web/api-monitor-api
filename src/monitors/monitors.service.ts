import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class MonitorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: SupabaseUser, serviceId?: string) {
    return this.prisma.monitor.findMany({
      where: {
        service: {
          userId: user.id,
          ...(serviceId ? { id: serviceId } : {}),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: SupabaseUser) {
    return this.prisma.monitor.findFirst({
      where: {
        id,
        service: { userId: user.id },
      },
    });
  }

  async create(
    user: SupabaseUser,
    data: {
      serviceId: string;
      name: string;
      url: string;
      timeout?: number;
      expectedStatus?: number;
      interval?: number;
    },
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id: data.serviceId, userId: user.id },
    });

    if (!service) return null;

    return this.prisma.monitor.create({
      data: {
        name: data.name,
        url: data.url,
        serviceId: data.serviceId,
        timeout: data.timeout ?? 10000,
        expectedStatus: data.expectedStatus ?? 200,
        interval: data.interval ?? 60,
      },
    });
  }

  async updateStatus(id: string, user: SupabaseUser, isActive: boolean) {
    const monitor = await this.findOne(id, user);
    if (!monitor) return null;

    return this.prisma.monitor.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string, user: SupabaseUser) {
    const monitor = await this.findOne(id, user);
    if (!monitor) return null;

    return this.prisma.monitor.delete({ where: { id } });
  }
}

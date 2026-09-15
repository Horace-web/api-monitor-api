import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: SupabaseUser, options: { page?: number; limit?: number; search?: string } = {}) {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
    const search = options.search?.trim();
    const where = {
      userId: user.id,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { monitors: true } } },
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: SupabaseUser) {
    return this.prisma.service.findFirst({ where: { id, userId: user.id }, include: { monitors: true } });
  }

  async create(user: SupabaseUser, data: { name: string; description?: string }) {
    await this.prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email ?? `${user.id}@unknown.local` },
      create: { id: user.id, email: user.email ?? `${user.id}@unknown.local` },
    });

    return this.prisma.service.create({ data: { name: data.name, description: data.description, userId: user.id } });
  }

  async remove(id: string, user: SupabaseUser) {
    const service = await this.prisma.service.findFirst({ where: { id, userId: user.id } });
    if (!service) return null;
    return this.prisma.service.delete({ where: { id } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseUser } from '@/auth/supabase-auth.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: SupabaseUser) {
    return this.prisma.service.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { monitors: true } } },
    });
  }

  async findOne(id: string, user: SupabaseUser) {
    return this.prisma.service.findFirst({
      where: { id, userId: user.id },
      include: { monitors: true },
    });
  }

  async create(
    user: SupabaseUser,
    data: { name: string; description?: string },
  ) {
    await this.prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email ?? `${user.id}@unknown.local` },
      create: {
        id: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
      },
    });

    return this.prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        userId: user.id,
      },
    });
  }

  async remove(id: string, user: SupabaseUser) {
    const service = await this.prisma.service.findFirst({
      where: { id, userId: user.id },
    });

    if (!service) return null;

    return this.prisma.service.delete({ where: { id } });
  }
}

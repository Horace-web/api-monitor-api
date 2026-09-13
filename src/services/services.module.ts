import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Services Module
 *
 * Manages logical groupings of monitors.
 * A "Service" represents a collection of related monitors (e.g., "Frontend", "Backend").
 *
 * This module will implement:
 * - CRUD operations for services
 * - Service ownership and permissions
 * - Service statistics and status aggregation
 *
 * Hierarchy: User → Service → Monitor
 *
 * Dependencies:
 * - PrismaModule (for database access)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class ServicesModule {}

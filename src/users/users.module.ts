import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Users Module
 *
 * Manages user account operations.
 * This module will implement:
 * - User CRUD operations
 * - User profile management
 * - User password handling
 *
 * Dependencies:
 * - PrismaModule (for database access)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class UsersModule {}

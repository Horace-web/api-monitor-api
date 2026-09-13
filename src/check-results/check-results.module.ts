import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Check Results Module
 *
 * Manages the storage and retrieval of monitoring check results.
 * Each time a monitor is checked, the result is stored as a CheckResult record.
 *
 * This module will implement:
 * - CheckResult CRUD operations
 * - Check history retrieval (with filtering and pagination)
 * - Statistics and analytics (uptime percentage, average response time)
 * - Historical data cleanup (for performance and storage optimization)
 *
 * Hierarchy: Monitor → CheckResult
 *
 * CheckResult attributes (planned):
 * - monitor_id (which monitor was checked)
 * - status (success/failure)
 * - status_code (HTTP status code)
 * - response_time (in ms)
 * - error_message (if failed)
 * - checked_at (timestamp)
 *
 * Dependencies:
 * - PrismaModule (for database access)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class CheckResultsModule {}

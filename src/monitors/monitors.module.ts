import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Monitors Module
 *
 * Manages monitor configurations.
 * A "Monitor" is a specific endpoint configuration to be checked (e.g., GET https://api.example.com/health).
 *
 * This module will implement:
 * - CRUD operations for monitors
 * - Monitor configuration management
 * - Monitor enable/disable functionality
 * - Interval/frequency settings for checks
 *
 * Hierarchy: Service → Monitor → CheckResult
 *
 * Dependencies:
 * - PrismaModule (for database access)
 * - MonitoringModule (to trigger monitoring jobs)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class MonitorsModule {}

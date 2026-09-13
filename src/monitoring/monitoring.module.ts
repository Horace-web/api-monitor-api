import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Monitoring Module
 *
 * Core monitoring engine that performs HTTP checks and manages the scheduling system.
 * This is the heart of the application - where actual API monitoring happens.
 *
 * This module will implement:
 * - Task scheduler (using @nestjs/schedule or similar)
 * - HTTP client for making GET requests to monitored URLs
 * - Check execution logic with timeout and retry handling
 * - CheckResult creation and storage
 * - Incident detection (when checks fail)
 *
 * MVP Features:
 * - GET requests only
 * - Configurable timeouts (from .env: MONITORING_TIMEOUT)
 * - Retry mechanism (from .env: MONITORING_RETRIES)
 * - Status code validation (2xx = success, others = failure)
 *
 * Future Features:
 * - Response time tracking
 * - Custom header support
 * - Response body validation
 * - Different HTTP methods (POST, PUT, DELETE, etc)
 * - SSL certificate validation
 *
 * Dependencies:
 * - PrismaModule (for database access)
 * - HttpModule (for HTTP requests - @nestjs/axios)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class MonitoringModule {}

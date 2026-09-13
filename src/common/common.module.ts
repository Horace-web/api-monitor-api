import { Module } from '@nestjs/common';

/**
 * Common Module
 *
 * This module contains shared utilities, guards, interceptors, and filters
 * that are used across multiple feature modules.
 *
 * TODO: Add common components here:
 * - Exception filters (for consistent error handling)
 * - HTTP interceptors (for logging, error transformation)
 * - Guards (JWT, role-based access control)
 * - DTOs and validation pipes
 * - Utilities and helpers
 */
@Module({})
export class CommonModule {}

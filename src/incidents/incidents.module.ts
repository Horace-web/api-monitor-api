import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Incidents Module
 *
 * Manages incident tracking and alerting.
 * An "Incident" is created when a monitor fails and escalated when consecutive failures occur.
 *
 * This module will implement:
 * - Incident creation and management
 * - Incident lifecycle (open, acknowledged, resolved)
 * - Incident history and timeline
 * - Alert notifications (email, webhooks, etc)
 *
 * Hierarchy: Monitor → Incident
 *
 * Incident attributes (planned):
 * - monitor_id (which monitor triggered the incident)
 * - status (open/acknowledged/resolved)
 * - severity (low/medium/high)
 * - started_at (when the incident began)
 * - resolved_at (when the incident was resolved)
 * - failure_count (consecutive failures)
 * - last_check_result_id (reference to triggering check)
 *
 * Future Features:
 * - Notification channels (email, Slack, SMS)
 * - Escalation policies
 * - Incident timelines with notes
 * - On-call scheduling integration
 *
 * Dependencies:
 * - PrismaModule (for database access)
 */
@Module({
  imports: [PrismaModule],
  exports: [],
})
export class IncidentsModule {}

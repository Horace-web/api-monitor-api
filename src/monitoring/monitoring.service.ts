import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { TargetUrlService } from '@/common/target-url.service';
import { IncidentsService } from '@/incidents/incidents.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private isCheckCycleRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly targetUrlService: TargetUrlService,
    private readonly incidents: IncidentsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'monitor-active-apis' })
  async runScheduledChecks(): Promise<void> {
    if (this.isCheckCycleRunning) {
      this.logger.warn('Previous monitoring cycle is still running; skipping this cycle.');
      return;
    }

    this.isCheckCycleRunning = true;

    try {
      const monitors = await this.prisma.monitor.findMany({
        where: { isActive: true },
        include: {
          checkResults: { orderBy: { checkedAt: 'desc' }, take: 1 },
          service: { select: { userId: true, user: { select: { email: true } } } },
        },
      });

      const now = Date.now();
      const dueMonitors = monitors.filter((monitor) => {
        const lastCheck = monitor.checkResults[0]?.checkedAt;
        return !lastCheck || now - lastCheck.getTime() >= monitor.interval * 1000;
      });

      if (dueMonitors.length === 0) return;
      await Promise.all(dueMonitors.map((monitor) => this.checkMonitor(monitor)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Monitoring cycle failed: ${message}`);
    } finally {
      this.isCheckCycleRunning = false;
    }
  }

  private async saveCheckResult(
    monitorId: string,
    startedAt: Date,
    data: { status: 'UP' | 'DOWN'; statusCode?: number; responseTime?: number; error?: string },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const [{ locked }] = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext(${monitorId})) AS locked
      `;

      if (!locked) return false;

      const newerCheck = await tx.checkResult.findFirst({
        where: { monitorId, checkedAt: { gte: startedAt } },
        select: { id: true },
      });

      if (newerCheck) return false;

      await tx.checkResult.create({
        data: {
          monitorId,
          status: data.status,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          error: data.error,
        },
      });

      return true;
    });
  }

  private async checkMonitor(monitor: {
    id: string;
    name: string;
    url: string;
    timeout: number;
    expectedStatus: number;
    service: { userId: string; user: { email: string } };
  }): Promise<void> {
    const startedAt = new Date();

    try {
      const url = await this.targetUrlService.validate(monitor.url);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(monitor.timeout),
      });

      const responseTime = Date.now() - startedAt.getTime();
      const status = response.status === monitor.expectedStatus ? 'UP' : 'DOWN';
      const redirectLocation = response.headers.get('location');
      const error = redirectLocation ? `HTTP redirect received (${response.status})` : undefined;
      const saved = await this.saveCheckResult(monitor.id, startedAt, {
        status,
        statusCode: response.status,
        responseTime,
        error: status === 'DOWN' ? error : undefined,
      });

      if (!saved) {
        this.logger.warn(`Skipping duplicate check result for monitor ${monitor.id}.`);
        return;
      }

      if (status === 'DOWN') {
        await this.incidents.handleDown({
          monitorId: monitor.id,
          userId: monitor.service.userId,
          email: monitor.service.user.email,
          monitorName: monitor.name,
          url: monitor.url,
          error,
          statusCode: response.status,
        });
      } else {
        await this.incidents.handleUp({
          monitorId: monitor.id,
          userId: monitor.service.userId,
          email: monitor.service.user.email,
          monitorName: monitor.name,
          url: monitor.url,
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const saved = await this.saveCheckResult(monitor.id, startedAt, {
        status: 'DOWN',
        responseTime,
        error: message.slice(0, 1000),
      });

      if (!saved) {
        this.logger.warn(`Skipping duplicate failed check for monitor ${monitor.id}.`);
        return;
      }

      await this.incidents.handleDown({
        monitorId: monitor.id,
        userId: monitor.service.userId,
        email: monitor.service.user.email,
        monitorName: monitor.name,
        url: monitor.url,
        error: message.slice(0, 1000),
      });

      this.logger.warn(`Monitor ${monitor.id} failed: ${message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { TargetUrlService } from '@/common/target-url.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly targetUrlService: TargetUrlService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'monitor-active-apis',
    waitForCompletion: true,
  })
  async runScheduledChecks(): Promise<void> {
    const monitors = await this.prisma.monitor.findMany({
      where: { isActive: true },
      include: {
        checkResults: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    const now = Date.now();
    const dueMonitors = monitors.filter((monitor) => {
      const lastCheck = monitor.checkResults[0]?.checkedAt;
      return !lastCheck || now - lastCheck.getTime() >= monitor.interval * 1000;
    });

    if (dueMonitors.length === 0) return;

    await Promise.all(dueMonitors.map((monitor) => this.checkMonitor(monitor)));
  }

  private async checkMonitor(monitor: {
    id: string;
    url: string;
    timeout: number;
    expectedStatus: number;
  }): Promise<void> {
    const startedAt = Date.now();

    try {
      const url = await this.targetUrlService.validate(monitor.url);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(monitor.timeout),
      });

      const responseTime = Date.now() - startedAt;
      const status = response.status === monitor.expectedStatus ? 'UP' : 'DOWN';
      const redirectLocation = response.headers.get('location');
      const error = redirectLocation
        ? `HTTP redirect received (${response.status})`
        : undefined;

      await this.prisma.checkResult.create({
        data: {
          monitorId: monitor.id,
          status,
          statusCode: response.status,
          responseTime,
          error: status === 'DOWN' ? error : undefined,
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.checkResult.create({
        data: {
          monitorId: monitor.id,
          status: 'DOWN',
          responseTime,
          error: message.slice(0, 1000),
        },
      });

      this.logger.warn(`Monitor ${monitor.id} failed: ${message}`);
    }
  }
}

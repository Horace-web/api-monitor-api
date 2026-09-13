import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'monitor-active-apis',
    waitForCompletion: true,
  })
  async runScheduledChecks(): Promise<void> {
    const monitors = await this.prisma.monitor.findMany({
      where: { isActive: true },
    });

    if (monitors.length === 0) return;

    await Promise.all(monitors.map((monitor) => this.checkMonitor(monitor)));
  }

  private async checkMonitor(monitor: {
    id: string;
    url: string;
    timeout: number;
    expectedStatus: number;
  }): Promise<void> {
    const startedAt = Date.now();

    try {
      const response = await fetch(monitor.url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(monitor.timeout),
      });

      const responseTime = Date.now() - startedAt;
      const status =
        response.status === monitor.expectedStatus ? 'UP' : 'DOWN';

      await this.prisma.checkResult.create({
        data: {
          monitorId: monitor.id,
          status,
          statusCode: response.status,
          responseTime,
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

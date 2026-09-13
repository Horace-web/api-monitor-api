import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
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
      const url = await this.validateTarget(monitor.url);

      const response = await fetch(url, {
        method: 'GET',
        // Do not follow redirects automatically: otherwise a safe public URL
        // could redirect the worker toward a private/internal address.
        redirect: 'manual',
        signal: AbortSignal.timeout(monitor.timeout),
      });

      const responseTime = Date.now() - startedAt;
      const status =
        response.status === monitor.expectedStatus ? 'UP' : 'DOWN';
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

  private async validateTarget(rawUrl: string): Promise<string> {
    const url = new URL(rawUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS targets are supported');
    }

    if (url.username || url.password) {
      throw new Error('Target URLs must not contain credentials');
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === 'metadata.google.internal'
    ) {
      throw new Error('Private or local targets are not allowed');
    }

    const addresses = isIP(hostname)
      ? [hostname]
      : (await lookup(hostname, { all: true })).map((entry) => entry.address);

    if (addresses.length === 0 || addresses.some((address) => this.isPrivateIp(address))) {
      throw new Error('Private or local targets are not allowed');
    }

    return url.toString();
  }

  private isPrivateIp(address: string): boolean {
    if (isIP(address) === 4) {
      const parts = address.split('.').map(Number);
      const [a, b] = parts;

      return (
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 0)
      );
    }

    const normalized = address.toLowerCase();
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }
}

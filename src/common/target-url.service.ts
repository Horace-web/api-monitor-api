import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

@Injectable()
export class TargetUrlService {
  async validate(rawUrl: string): Promise<string> {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error('Target URL must be valid');
    }

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

    if (
      addresses.length === 0 ||
      addresses.some((address) => this.isPrivateIp(address))
    ) {
      throw new Error('Private or local targets are not allowed');
    }

    return url.toString();
  }

  private isPrivateIp(address: string): boolean {
    if (isIP(address) === 4) {
      const [a, b, c] = address.split('.').map(Number);

      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0 && c === 0) ||
        (a === 192 && b === 168) ||
        (a === 198 && b >= 18 && b <= 19) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        a >= 224
      );
    }

    const normalized = address.toLowerCase();
    const mappedIpv4 = normalized.startsWith('::ffff:')
      ? normalized.slice(7)
      : null;

    if (mappedIpv4 && isIP(mappedIpv4) === 4) {
      return this.isPrivateIp(mappedIpv4);
    }

    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }
}

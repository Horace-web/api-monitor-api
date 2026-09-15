import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendIncidentEmail(input: {
    to: string;
    monitorName: string;
    url: string;
    error?: string | null;
    statusCode?: number | null;
    startedAt: Date;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;

    if (!apiKey || !from) {
      this.logger.warn('Incident email skipped: RESEND_API_KEY or ALERT_FROM_EMAIL is not configured.');
      return;
    }

    const details = [
      input.statusCode ? `HTTP ${input.statusCode}` : null,
      input.error ? input.error : null,
    ].filter(Boolean).join(' — ');

    await this.send({
      to: input.to,
      subject: `Incident détecté — ${input.monitorName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Incident détecté</h2>
          <p>Le monitor <strong>${this.escape(input.monitorName)}</strong> est actuellement DOWN.</p>
          <p><strong>URL :</strong> ${this.escape(input.url)}</p>
          ${details ? `<p><strong>Détail :</strong> ${this.escape(details)}</p>` : ''}
          <p><strong>Début :</strong> ${input.startedAt.toISOString()}</p>
        </div>
      `,
    });
  }

  async sendRecoveryEmail(input: {
    to: string;
    monitorName: string;
    url: string;
    resolvedAt: Date;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;

    if (!apiKey || !from) {
      this.logger.warn('Recovery email skipped: RESEND_API_KEY or ALERT_FROM_EMAIL is not configured.');
      return;
    }

    await this.send({
      to: input.to,
      subject: `Monitor rétabli — ${input.monitorName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Service rétabli</h2>
          <p>Le monitor <strong>${this.escape(input.monitorName)}</strong> est de nouveau UP.</p>
          <p><strong>URL :</strong> ${this.escape(input.url)}</p>
          <p><strong>Rétabli le :</strong> ${input.resolvedAt.toISOString()}</p>
        </div>
      `,
    });
  }

  private async send(input: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.ALERT_FROM_EMAIL,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend returned ${response.status}: ${body.slice(0, 500)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Incident notification failed: ${message}`);
    }
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }
}

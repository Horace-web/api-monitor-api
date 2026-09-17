import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  async sendIncidentEmail(input: {
    to: string;
    monitorName: string;
    url: string;
    error?: string | null;
    statusCode?: number | null;
    startedAt: Date;
  }): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;

    this.logger.log(
      `Incident email requested: monitor=${input.monitorName}, statusCode=${input.statusCode ?? 'none'}, recipientConfigured=${Boolean(input.to)}, apiKeyConfigured=${Boolean(apiKey)}, senderConfigured=${Boolean(from)}`,
    );

    if (!apiKey || !from) {
      this.logger.warn('Incident email skipped: BREVO_API_KEY or ALERT_FROM_EMAIL is not configured.');
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
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;

    this.logger.log(
      `Recovery email requested: monitor=${input.monitorName}, recipientConfigured=${Boolean(input.to)}, apiKeyConfigured=${Boolean(apiKey)}, senderConfigured=${Boolean(from)}`,
    );

    if (!apiKey || !from) {
      this.logger.warn('Recovery email skipped: BREVO_API_KEY or ALERT_FROM_EMAIL is not configured.');
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
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;
    const fromName = process.env.ALERT_FROM_NAME || 'API Monitor';

    this.logger.log(
      `Brevo request starting: subject="${input.subject}", senderConfigured=${Boolean(from)}, senderName="${fromName}", recipientConfigured=${Boolean(input.to)}`,
    );

    if (!apiKey || !from) {
      this.logger.warn('Email notification skipped: BREVO_API_KEY or ALERT_FROM_EMAIL is not configured.');
      return;
    }

    try {
      const response = await fetch(this.brevoApiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: from,
          },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
        }),
      });

      this.logger.log(`Brevo response received: status=${response.status}, ok=${response.ok}, subject="${input.subject}".`);

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Brevo rejected notification: status=${response.status}, body=${body.slice(0, 500)}`);
        throw new Error(`Brevo returned ${response.status}: ${body.slice(0, 500)}`);
      }

      const result = (await response.json()) as { messageId?: string };
      this.logger.log(
        `Email notification sent through Brevo${result.messageId ? `: ${result.messageId}` : ''}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Incident notification failed: ${message}`);
    }
  }

  private escape(value: string): string {
    return value.replace(/[&<>\"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }
}

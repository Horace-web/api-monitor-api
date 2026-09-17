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
      html: this.buildIncidentEmail({ ...input, details }),
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
      html: this.buildRecoveryEmail(input),
    });
  }

  private buildIncidentEmail(input: {
    monitorName: string;
    url: string;
    error?: string | null;
    statusCode?: number | null;
    startedAt: Date;
    details: string;
  }): string {
    const statusCode = input.statusCode ? String(input.statusCode) : '—';

    return `
      <div style="margin:0;padding:32px 16px;background-color:#030405;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
        <div style="max-width:620px;margin:0 auto;">
          <div style="padding:0 4px 18px;">
            <div style="font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;">API <span style="color:#E8611A;">Monitor</span></div>
            <div style="margin-top:5px;font-size:12px;color:#8b929d;letter-spacing:0.3px;">Automated service monitoring</div>
          </div>

          <div style="background-color:#0A0C0F;border:1px solid #242830;border-radius:12px;overflow:hidden;">
            <div style="height:4px;background-color:#E8611A;"></div>

            <div style="padding:28px;">
              <div style="display:inline-block;padding:6px 10px;border:1px solid #6b351d;border-radius:999px;background-color:#21130d;color:#ff9a68;font-size:11px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
                Incident détecté
              </div>

              <h1 style="margin:18px 0 8px;font-size:24px;line-height:1.25;color:#ffffff;font-weight:700;">
                ${this.escape(input.monitorName)} est indisponible
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#9da3ad;">
                Une anomalie a été détectée par votre monitoring automatique. Le service est actuellement marqué comme <strong style="color:#ff9a68;">DOWN</strong>.
              </p>

              <div style="border:1px solid #242830;border-radius:9px;background-color:#111317;overflow:hidden;">
                <div style="padding:14px 16px;border-bottom:1px solid #242830;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Détails du monitoring</div>
                <div style="padding:4px 16px;">
                  <div style="padding:12px 0;border-bottom:1px solid #1d2026;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">SERVICE</div>
                    <div style="font-size:13px;color:#e7e9ec;">${this.escape(input.monitorName)}</div>
                  </div>
                  <div style="padding:12px 0;border-bottom:1px solid #1d2026;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">URL</div>
                    <div style="font-size:13px;color:#e7e9ec;word-break:break-all;">${this.escape(input.url)}</div>
                  </div>
                  <div style="padding:12px 0;border-bottom:1px solid #1d2026;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">STATUT HTTP</div>
                    <div style="font-size:13px;font-weight:700;color:#ff9a68;">${this.escape(statusCode)}</div>
                  </div>
                  <div style="padding:12px 0;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">DÉBUT DE L'INCIDENT</div>
                    <div style="font-size:13px;color:#e7e9ec;">${this.escape(input.startedAt.toISOString())}</div>
                  </div>
                </div>
              </div>

              ${input.details ? `
                <div style="margin-top:16px;padding:14px 16px;border-left:3px solid #E8611A;border-radius:6px;background-color:#111317;">
                  <div style="font-size:11px;font-weight:700;color:#737b87;margin-bottom:5px;">DÉTAIL</div>
                  <div style="font-size:13px;line-height:1.6;color:#d9dce1;word-break:break-word;">${this.escape(input.details)}</div>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="padding:18px 4px 0;text-align:center;font-size:11px;line-height:1.6;color:#626975;">
            API Monitor · Surveillance automatisée de vos services
          </div>
        </div>
      </div>
    `;
  }

  private buildRecoveryEmail(input: {
    monitorName: string;
    url: string;
    resolvedAt: Date;
  }): string {
    return `
      <div style="margin:0;padding:32px 16px;background-color:#030405;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
        <div style="max-width:620px;margin:0 auto;">
          <div style="padding:0 4px 18px;">
            <div style="font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;">API <span style="color:#E8611A;">Monitor</span></div>
            <div style="margin-top:5px;font-size:12px;color:#8b929d;letter-spacing:0.3px;">Automated service monitoring</div>
          </div>

          <div style="background-color:#0A0C0F;border:1px solid #242830;border-radius:12px;overflow:hidden;">
            <div style="height:4px;background-color:#1D3461;"></div>
            <div style="padding:28px;">
              <div style="display:inline-block;padding:6px 10px;border:1px solid #29436f;border-radius:999px;background-color:#0f1929;color:#8eaddb;font-size:11px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
                Service rétabli
              </div>

              <h1 style="margin:18px 0 8px;font-size:24px;line-height:1.25;color:#ffffff;font-weight:700;">
                ${this.escape(input.monitorName)} est de nouveau disponible
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#9da3ad;">
                Le monitoring a détecté le retour à un état normal. Le service est de nouveau marqué comme <strong style="color:#8eaddb;">UP</strong>.
              </p>

              <div style="border:1px solid #242830;border-radius:9px;background-color:#111317;overflow:hidden;">
                <div style="padding:14px 16px;border-bottom:1px solid #242830;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Détails du rétablissement</div>
                <div style="padding:4px 16px;">
                  <div style="padding:12px 0;border-bottom:1px solid #1d2026;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">SERVICE</div>
                    <div style="font-size:13px;color:#e7e9ec;">${this.escape(input.monitorName)}</div>
                  </div>
                  <div style="padding:12px 0;border-bottom:1px solid #1d2026;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">URL</div>
                    <div style="font-size:13px;color:#e7e9ec;word-break:break-all;">${this.escape(input.url)}</div>
                  </div>
                  <div style="padding:12px 0;">
                    <div style="font-size:11px;color:#737b87;margin-bottom:4px;">RÉTABLI LE</div>
                    <div style="font-size:13px;color:#e7e9ec;">${this.escape(input.resolvedAt.toISOString())}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="padding:18px 4px 0;text-align:center;font-size:11px;line-height:1.6;color:#626975;">
            API Monitor · Surveillance automatisée de vos services
          </div>
        </div>
      </div>
    `;
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

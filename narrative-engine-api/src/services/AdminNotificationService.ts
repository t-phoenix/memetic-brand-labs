import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { BusinessConfigService } from './BusinessConfigService.js';

export class AdminNotificationService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
    private readonly config: BusinessConfigService,
  ) {}

  async notifyRunCompleted(runId: string) {
    const enabled = await this.config.get<boolean>('email.admin_notify_enabled', true);
    if (!enabled) return;

    const recipients = await this.config.get<string[]>('email.admin_notify_recipients', [
      'abhinil.agarwal@adpr.work',
      'anand.peter@adpr.work',
    ]);
    const to = (recipients ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!to.length) return;

    const { data: existing } = await this.db
      .from('admin_notification_deliveries')
      .select('id')
      .eq('run_id', runId)
      .maybeSingle();
    if (existing) return;

    const { data: run } = await this.db
      .from('engine_runs')
      .select('id, status, run_source, unlock_method, contact_email, payer_wallet, created_at, completed_at')
      .eq('id', runId)
      .maybeSingle();
    if (!run || run.status !== 'completed') return;
    if (run.run_source === 'admin_test') return;

    const [{ data: input }, { data: share }] = await Promise.all([
      this.db.from('run_inputs').select('building, audience').eq('run_id', runId).maybeSingle(),
      this.db.from('share_assets').select('share_id').eq('run_id', runId).maybeSingle(),
    ]);

    const apiBase = this.env.API_PUBLIC_URL ?? `http://localhost:${this.env.PORT}`;
    const frontendBase = this.env.FRONTEND_URL.replace(/\/$/, '');
    const adminUrl = `${frontendBase}/admin/runs/${runId}`;
    const shareUrl = share?.share_id ? `${frontendBase}/results/${share.share_id}` : null;
    const graphicUrl = share?.share_id ? `${apiBase}/v1/results/${share.share_id}/graphic.png` : null;

    const { data: deliveryRow } = await this.db
      .from('admin_notification_deliveries')
      .insert({ run_id: runId, recipients: to, status: 'queued' })
      .select('id')
      .single();

    if (!this.env.RESEND_API_KEY) {
      await this.markFailed(deliveryRow?.id as string, 'resend_not_configured');
      return;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(this.env.RESEND_API_KEY);
      const from = await this.config.get<string>('email.results_from', this.env.RESULTS_EMAIL_FROM);
      const subject = `Narrative Engine run completed${input?.building ? ` — ${String(input.building).slice(0, 60)}` : ''}`;
      const html = buildAdminHtml({
        runId,
        building: input?.building ?? null,
        audience: input?.audience ?? null,
        contactEmail: run.contact_email ?? null,
        unlockMethod: run.unlock_method ?? null,
        payerWallet: run.payer_wallet ?? null,
        adminUrl,
        shareUrl,
        graphicUrl,
      });
      const text = buildAdminText({
        runId,
        building: input?.building ?? null,
        audience: input?.audience ?? null,
        contactEmail: run.contact_email ?? null,
        unlockMethod: run.unlock_method ?? null,
        payerWallet: run.payer_wallet ?? null,
        adminUrl,
        shareUrl,
        graphicUrl,
      });

      const result = await resend.emails.send({ from, to, subject, html, text });

      await this.db
        .from('admin_notification_deliveries')
        .update({
          status: 'sent',
          provider_message_id: result.data?.id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', deliveryRow?.id);
    } catch (err) {
      await this.markFailed(deliveryRow?.id as string, 'admin_notify_failed', err);
    }
  }

  private async markFailed(deliveryId: string | undefined, code: string, err?: unknown) {
    if (!deliveryId) return;
    await this.db
      .from('admin_notification_deliveries')
      .update({
        status: 'failed',
        failure_code: code,
        failure_detail: { message: err instanceof Error ? err.message : String(err) },
      })
      .eq('id', deliveryId);
  }
}

function buildAdminHtml(opts: {
  runId: string;
  building: string | null;
  audience: string | null;
  contactEmail: string | null;
  unlockMethod: string | null;
  payerWallet: string | null;
  adminUrl: string;
  shareUrl: string | null;
  graphicUrl: string | null;
}) {
  const rows = [
    ['Run ID', opts.runId],
    ['Brand', opts.building ?? '—'],
    ['Audience', opts.audience ?? '—'],
    ['Contact email', opts.contactEmail ?? '—'],
    ['Unlock method', opts.unlockMethod ?? '—'],
    ['Payer wallet', opts.payerWallet ?? '—'],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const graphic = opts.graphicUrl
    ? `<p style="margin:16px 0;"><img src="${opts.graphicUrl}" alt="Result preview" style="max-width:100%;border:1px solid #e5e5e5;border-radius:8px;" /></p>`
    : '<p style="color:#666;">Result graphic not available.</p>';

  const links = [
    `<a href="${opts.adminUrl}" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open in admin dashboard</a>`,
    opts.shareUrl ? `<a href="${opts.shareUrl}" style="margin-left:12px;">Public results</a>` : '',
  ].join(' ');

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111;">
    <h1 style="font-size:18px;">Narrative Engine run completed</h1>
    <table style="margin:16px 0;font-size:14px;">${rows}</table>
    ${graphic}
    <p style="margin:24px 0;">${links}</p>
  </body></html>`;
}

function buildAdminText(opts: {
  runId: string;
  building: string | null;
  audience: string | null;
  contactEmail: string | null;
  unlockMethod: string | null;
  payerWallet: string | null;
  adminUrl: string;
  shareUrl: string | null;
  graphicUrl: string | null;
}) {
  return [
    'Narrative Engine run completed',
    '',
    `Run ID: ${opts.runId}`,
    `Brand: ${opts.building ?? '—'}`,
    `Audience: ${opts.audience ?? '—'}`,
    `Contact email: ${opts.contactEmail ?? '—'}`,
    `Unlock method: ${opts.unlockMethod ?? '—'}`,
    `Payer wallet: ${opts.payerWallet ?? '—'}`,
    '',
    opts.graphicUrl ? `Result graphic: ${opts.graphicUrl}` : 'Result graphic: not available',
    `Admin dashboard: ${opts.adminUrl}`,
    opts.shareUrl ? `Public results: ${opts.shareUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { BusinessConfigService } from './BusinessConfigService.js';
import { sha256 } from '../utils/hash.js';
import { emailDomain } from '../lib/apiError.js';

export class ResultsEmailService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
    private readonly config: BusinessConfigService,
  ) {}

  /** Send results email after pipeline completes (uses contact_email on the run). */
  async enqueueOnComplete(runId: string) {
    const enabled = await this.config.get<boolean>('email.results_enabled', true);
    if (!enabled) return;

    const { data: run } = await this.db
      .from('engine_runs')
      .select('contact_email, status')
      .eq('id', runId)
      .maybeSingle();
    if (!run?.contact_email || run.status !== 'completed') return;

    const { data: existing } = await this.db
      .from('result_email_deliveries')
      .select('id')
      .eq('run_id', runId)
      .in('status', ['sent', 'delivered', 'queued'])
      .maybeSingle();
    if (existing) return;

    const { count: cardCount } = await this.db
      .from('run_outputs')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', runId);
    if (!cardCount) return;

    await this.enqueue(runId, run.contact_email);
  }

  async enqueue(runId: string, recipientEmail: string, grantId?: string) {
    const enabled = await this.config.get<boolean>('email.results_enabled', true);
    if (!enabled || !recipientEmail) return;

    const { data: existing } = await this.db
      .from('result_email_deliveries')
      .select('id')
      .eq('run_id', runId)
      .in('status', ['sent', 'delivered', 'queued'])
      .maybeSingle();
    if (existing) return;

    const domain = emailDomain(recipientEmail);
    const { data: row } = await this.db
      .from('result_email_deliveries')
      .insert({
        run_id: runId,
        grant_id: grantId ?? null,
        recipient_email_hash: sha256(recipientEmail.toLowerCase()),
        recipient_domain: domain,
        status: 'queued',
      })
      .select('id')
      .single();

    void this.send(runId, recipientEmail, row?.id as string);
  }

  async send(runId: string, recipientEmail: string, deliveryId?: string) {
    if (!this.env.RESEND_API_KEY) {
      await this.markFailed(deliveryId, 'resend_not_configured');
      return;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(this.env.RESEND_API_KEY);

      const { data: cards } = await this.db.from('run_outputs').select('*').eq('run_id', runId).order('card_meta->order');
      const { data: share } = await this.db.from('share_assets').select('share_id').eq('run_id', runId).maybeSingle();
      const { data: input } = await this.db.from('run_inputs').select('building').eq('run_id', runId).maybeSingle();

      const from = await this.config.get<string>('email.results_from', this.env.RESULTS_EMAIL_FROM);
      const replyTo = await this.config.get<string>('email.results_reply_to', 'hello@adpr.work');
      const includeShare = await this.config.get<boolean>('email.results_include_share_link', true);
      const workshopEnabled = await this.config.get<boolean>('email.workshop_cta_enabled', true);
      const workshopUrl = await this.config.get<string>(
        'email.workshop_cta_url',
        'https://memetic.adpr.work/application-form',
      );
      const workshopLabel = await this.config.get<string>(
        'email.workshop_cta_label',
        'Apply for the Memetic Brand Workshop',
      );
      const shareUrl = share?.share_id ? `${this.env.FRONTEND_URL}/results/${share.share_id}` : null;

      const workshop = { enabled: workshopEnabled, url: workshopUrl, label: workshopLabel };
      const subject = `Your Narrative Engine directions${input?.building ? ` — ${String(input.building).slice(0, 60)}` : ''}`;
      const html = buildResultsHtml(cards ?? [], shareUrl, includeShare, workshop);
      const text = buildResultsText(cards ?? [], shareUrl, includeShare, workshop);

      const result = await resend.emails.send({
        from,
        to: recipientEmail,
        replyTo,
        subject,
        html,
        text,
      });

      await this.db
        .from('result_email_deliveries')
        .update({
          status: 'sent',
          provider_message_id: result.data?.id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      return { sent: true, id: result.data?.id };
    } catch (e) {
      await this.markFailed(deliveryId, 'results_email_failed', e);
      return { sent: false };
    }
  }

  async resend(runId: string, recipientEmail: string) {
    const { count } = await this.db
      .from('result_email_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', runId);
    const { data: row } = await this.db
      .from('result_email_deliveries')
      .insert({
        run_id: runId,
        recipient_email_hash: sha256(recipientEmail.toLowerCase()),
        recipient_domain: emailDomain(recipientEmail),
        status: 'queued',
        attempt_number: (count ?? 0) + 1,
      })
      .select('id')
      .single();
    return this.send(runId, recipientEmail, row?.id as string);
  }

  private async markFailed(deliveryId: string | undefined, code: string, err?: unknown) {
    if (!deliveryId) return;
    await this.db
      .from('result_email_deliveries')
      .update({
        status: 'failed',
        failure_code: code,
        failure_detail: { message: err instanceof Error ? err.message : String(err) },
      })
      .eq('id', deliveryId);
  }
}

type WorkshopCta = { enabled: boolean; url: string; label: string };

function buildResultsHtml(
  cards: Array<{ card_label: string; content: string }>,
  shareUrl: string | null,
  includeShare: boolean,
  workshop: WorkshopCta,
) {
  const cardBlocks = cards
    .map(
      (c) => `<div style="margin:16px 0;padding:16px;border:1px solid #e5e5e5;border-radius:8px;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#666;">${escapeHtml(c.card_label)}</h3>
        <p style="margin:0;font-size:16px;line-height:1.5;">${escapeHtml(c.content)}</p>
      </div>`,
    )
    .join('');

  const cta = includeShare && shareUrl
    ? `<p style="margin:24px 0;"><a href="${shareUrl}" style="background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">View & share online</a></p>`
    : '';

  const workshopBlock = workshop.enabled
    ? `<div style="margin:32px 0;padding:20px;background:#f7f7f7;border-radius:8px;">
        <h2 style="margin:0 0 8px;font-size:16px;">Want to go deeper?</h2>
        <p style="margin:0 0 16px;color:#444;line-height:1.5;">You can still apply — the Memetic Brand Workshop goes further than these directions.</p>
        <a href="${workshop.url}" style="background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">${escapeHtml(workshop.label)}</a>
      </div>`
    : '';

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
    <h1 style="font-size:20px;">Your narrative directions</h1>
    <p style="color:#666;">From Memetic Brand Labs Narrative Engine</p>
    ${cardBlocks}
    ${cta}
    ${workshopBlock}
    <p style="font-size:12px;color:#999;margin-top:32px;">You received this because you ran Narrative Engine at memetic.adpr.work</p>
  </body></html>`;
}

function buildResultsText(
  cards: Array<{ card_label: string; content: string }>,
  shareUrl: string | null,
  includeShare: boolean,
  workshop: WorkshopCta,
) {
  const lines = cards.map((c) => `${c.card_label}\n${c.content}\n`);
  const share = includeShare && shareUrl ? `\nView online: ${shareUrl}\n` : '';
  const workshopText = workshop.enabled
    ? `\n\nWant to go deeper?\nThe Memetic Brand Workshop goes further than these directions.\n${workshop.label}: ${workshop.url}\n`
    : '';
  return `Your narrative directions\n\n${lines.join('\n')}${share}${workshopText}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { RunService } from '../services/RunService.js';
import { ShareService } from '../share/ShareService.js';
import { enqueueRun } from '../jobs/queue.js';
import { authOptional, requireAuth } from './auth.js';
import { hashIp } from '../utils/hash.js';
import { syncRunRevenue } from '../telemetry/TelemetryService.js';
import { extractHomepage } from '../website/HomepageExtractor.js';
import { LLMRouter } from '../llm/LLMRouter.js';
import { formatDbError, pingDatabase } from '../db/health.js';

export async function registerRoutes(app: FastifyInstance, env: Env) {
  const db = getSupabase(env);
  const runs = new RunService(db);
  const share = new ShareService(db, env);
  const llm = new LLMRouter(env);

  app.get('/health', async () => {
    const dbHealth = await pingDatabase(db);
    return {
      status: dbHealth.ok ? 'ok' : 'degraded',
      version: 'ne-v1.0.0',
      database: dbHealth.ok ? 'connected' : dbHealth.message,
    };
  });

  app.get('/v1/pricing-tiers', async (_request, reply) => {
    const { data, error } = await db
      .from('pricing_tiers')
      .select('tier_key, label, price_usdc, model_routing')
      .eq('is_active', true);
    if (error) {
      return reply.code(503).send({ error: { code: 'database_unavailable', message: formatDbError(error) } });
    }
    return { tiers: data ?? [] };
  });

  app.post('/v1/website-intake/analyze', async (request, reply) => {
    const body = request.body as { website?: string; website_url?: string };
    const website = String(body.website ?? body.website_url ?? '').trim();
    if (!website) {
      return reply.code(400).send({ error: { code: 'bad_request', message: 'website is required' } });
    }

    const extraction = await extractHomepage(website);
    if (extraction.fetch_status !== 'success') {
      return reply.code(422).send({
        error: { code: 'website_unavailable', message: `Website could not be processed (${extraction.fetch_status}).` },
      });
    }

    const answers = await generateFounderAnswersFromWebsite(llm, extraction.extracted);
    return {
      website,
      fetch_status: extraction.fetch_status,
      extracted: extraction.extracted,
      answers,
    };
  });

  app.post('/v1/narrative-runs', async (request, reply) => {
    await authOptional(request, env);
    const body = request.body as Record<string, string>;
    const sessionId = (request.headers['x-session-id'] as string) ?? body.session_id;
    const ip = request.ip;

    const isFirst = !request.user || !(await db.from('users').select('first_free_run_used_at').eq('id', request.user.id).maybeSingle()).data?.first_free_run_used_at;

    let runId: string;
    let sid: string;
    try {
      ({ runId, sessionId: sid } = await runs.createRun(
        {
          building: body.building,
          audience: body.audience,
          challenge: body.challenge,
          differentiation: body.differentiation,
          website: body.website,
          model_tier: (body.model_tier as 'fast' | 'standard' | 'quality') ?? 'fast',
          session_id: sessionId,
        },
        { userId: request.user?.id, isFirstRun: isFirst, paymentStatus: isFirst ? 'free' : 'pending' },
      ));
    } catch (err) {
      return reply.code(503).send({
        error: { code: 'database_unavailable', message: formatDbError(err), retryable: true },
      });
    }

    if (ip) {
      await db.from('user_sessions').update({ ip_hash: hashIp(ip, env.IP_HASH_SALT) }).eq('session_id', sid);
    }

    enqueueRun(env, runId);
    return reply.code(201).send({ run_id: runId, status: 'pending', session_id: sid });
  });

  app.get('/v1/narrative-runs/:id', async (request) => {
    await authOptional(request, env);
    const { id } = request.params as { id: string };
    const run = await runs.getRunStatus(id);
    if (!run) return { error: { code: 'not_found', message: 'Run not found' } };

    const response: Record<string, unknown> = {
      id: run.id,
      status: run.status,
      current_stage: run.current_stage,
      progress_pct: run.progress_pct,
    };

    if (run.email_verified_for_run || request.user?.id === run.user_id) {
      const outputs = await runs.getOutputs(id);
      response.outputs = outputs.cards;
      response.share_id = outputs.share_id;
    }

    return response;
  });

  app.get('/v1/narrative-runs/:id/outputs', async (request, reply) => {
    await authOptional(request, env);
    const { id } = request.params as { id: string };
    const run = await runs.getRunStatus(id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    if (!run.email_verified_for_run && request.user?.id !== run.user_id) {
      return reply.code(403).send({ error: { code: 'email_required', message: 'Verify email to view outputs' } });
    }
    const outputs = await runs.getOutputs(id);
    return {
      cards: outputs.cards,
      share_url: outputs.share_id ? `/results/${outputs.share_id}` : null,
      graphic_url: outputs.graphic_path ? `/v1/results/${outputs.share_id}/graphic.png` : null,
    };
  });

  app.post('/v1/narrative-runs/:id/verify-email', async (request) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    return runs.verifyEmail(id, email);
  });

  app.post('/v1/narrative-runs/rerun', async (request, reply) => {
    await authOptional(request, env);
    requireAuth(request);

    const paymentHeader = request.headers.payment ?? request.headers['x-payment'];
    if (!paymentHeader && env.X402_PAY_TO) {
      return reply.code(402).send({
        error: { code: 'payment_required', message: 'USDC payment required on Base' },
        payment: {
          amount_usdc: env.RERUN_PRICE_USDC,
          network: 'eip155:8453',
          asset: 'USDC',
          pay_to: env.X402_PAY_TO,
          facilitator: env.X402_FACILITATOR_URL,
        },
      });
    }

    const body = request.body as Record<string, string>;
    const { runId } = await runs.createRun(
      {
        building: body.building,
        audience: body.audience,
        challenge: body.challenge,
        differentiation: body.differentiation,
        website: body.website,
        model_tier: (body.model_tier as 'fast' | 'standard' | 'quality') ?? 'standard',
        parent_run_id: body.prior_run_id,
        session_id: body.session_id,
      },
      { userId: request.user!.id, isFirstRun: false, paymentStatus: 'paid' },
    );

    if (paymentHeader) {
      await db.from('payment_transactions').insert({
        run_id: runId,
        user_id: request.user!.id,
        amount_usdc: env.RERUN_PRICE_USDC,
        payer_address: 'unknown',
        payee_address: env.X402_PAY_TO ?? '',
        tx_hash: String(paymentHeader).slice(0, 64) || `pending-${runId}`,
        facilitator: env.X402_FACILITATOR_URL,
        status: 'confirmed',
      });
      await syncRunRevenue(db, runId, env.RERUN_PRICE_USDC);
    }

    enqueueRun(env, runId);
    return reply.code(201).send({ run_id: runId, status: 'pending' });
  });

  app.get('/v1/results/:shareId', async (request, reply) => {
    const { shareId } = request.params as { shareId: string };
    const data = await share.getPublic(shareId);
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Share not found' } });
    await share.trackEvent(shareId, 'view', request.headers.referer as string, request.headers['user-agent']);
    return data;
  });

  app.get('/v1/results/:shareId/graphic.png', async (request, reply) => {
    const { shareId } = request.params as { shareId: string };
    const { data: asset } = await db.from('share_assets').select('og_image_path').eq('share_id', shareId).maybeSingle();
    if (!asset?.og_image_path) return reply.code(404).send();
    const renderer = new (await import('../share/GraphicRenderer.js')).GraphicRenderer(env);
    const buf = await renderer.download(asset.og_image_path);
    if (!buf) return reply.code(404).send();
    await share.trackEvent(shareId, 'graphic_download');
    return reply.header('Content-Type', 'image/png').send(buf);
  });

  app.delete('/v1/me/runs/:id', async (request, reply) => {
    await authOptional(request, env);
    requireAuth(request);
    const { id } = request.params as { id: string };
    await runs.deleteRun(id, request.user!.id);
    return reply.code(204).send();
  });
}

async function generateFounderAnswersFromWebsite(llm: LLMRouter, extracted: Record<string, unknown>) {
  const fallback = buildHeuristicAnswers(extracted);
  const model = 'gpt-4o-mini';

  try {
    const system = `You help founders prefill a startup intake form using homepage evidence.

Return only JSON with keys:
- building
- audience
- challenge
- differentiation

Rules:
- building: what the company/product does in plain language.
- audience: who specifically this serves (people/team type, not "everyone").
- challenge: what pain/problem the audience faces today.
- differentiation: what is distinct in approach or value.
- Every field must be exactly 1 sentence, 8-24 words.
- Use concrete language from title/meta/H1/H2/CTA if available.
- Avoid hype, vague adjectives, and unverifiable claims.
- Do not mention "website", "homepage", "AI", or "this company".
- If evidence is thin, make the safest useful inference and stay specific.
- Never return empty strings.`;

    const user = `Website signals (JSON):\n${JSON.stringify(extracted, null, 2)}`;
    const res = await llm.complete(model, system, user);
    const parsed = JSON.parse(res.content) as Partial<Record<'building' | 'audience' | 'challenge' | 'differentiation', string>>;
    return {
      building: finalizePrefill(parsed.building, fallback.building),
      audience: finalizePrefill(parsed.audience, fallback.audience),
      challenge: finalizePrefill(parsed.challenge, fallback.challenge),
      differentiation: finalizePrefill(parsed.differentiation, fallback.differentiation),
    };
  } catch {
    return fallback;
  }
}

function finalizePrefill(value: unknown, fallback: string): string {
  const cleaned = sanitizeSentence(typeof value === 'string' ? value : '');
  if (!cleaned) return fallback;
  const words = cleaned.split(/\s+/).filter(Boolean).length;
  if (words < 5 || words > 30) return fallback;
  return cleaned;
}

function sanitizeSentence(value: string): string {
  let out = value.replace(/\s+/g, ' ').trim();
  out = out.replace(/^[-*•]\s*/, '');
  out = out.replace(/^"(.*)"$/, '$1').trim();
  if (!out) return '';
  if (!/[.!?]$/.test(out)) out += '.';
  return out;
}

function buildHeuristicAnswers(extracted: Record<string, unknown>) {
  const title = asString(extracted.title);
  const description = asString(extracted.meta_description);
  const h1 = asString(extracted.h1);
  const h2 = Array.isArray(extracted.h2) ? extracted.h2.map((v) => asString(v)).filter(Boolean) : [];
  const primaryMessage = [h1, title, description].find(Boolean) ?? 'A technology product with a clear customer promise.';
  const secondary = h2[0] || description || 'Improving outcomes with a focused solution.';

  return {
    building: primaryMessage,
    audience: inferAudience(primaryMessage, description),
    challenge: secondary,
    differentiation: h2[1] || 'A simpler and more focused approach than common alternatives.',
  };
}

function inferAudience(...parts: string[]) {
  const combined = parts.join(' ').toLowerCase();
  if (combined.includes('developer') || combined.includes('engineer')) return 'Developers and engineering teams.';
  if (combined.includes('founder') || combined.includes('startup')) return 'Founders and startup teams.';
  if (combined.includes('enterprise') || combined.includes('business')) return 'Business teams and enterprise customers.';
  return 'Teams that need this outcome.';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { RunService } from '../services/RunService.js';
import { ShareService } from '../share/ShareService.js';
import { enqueueRun } from '../jobs/queue.js';
import { authOptional, requireAuth } from './auth.js';
import { hashIp } from '../utils/hash.js';

export async function registerRoutes(app: FastifyInstance, env: Env) {
  const db = getSupabase(env);
  const runs = new RunService(db);
  const share = new ShareService(db, env);

  app.get('/health', async () => ({ status: 'ok', version: 'ne-v1.0.0' }));

  app.get('/v1/pricing-tiers', async () => {
    const { data } = await db.from('pricing_tiers').select('tier_key, label, price_usdc, model_routing').eq('is_active', true);
    return { tiers: data ?? [] };
  });

  app.post('/v1/narrative-runs', async (request, reply) => {
    await authOptional(request, env);
    const body = request.body as Record<string, string>;
    const sessionId = (request.headers['x-session-id'] as string) ?? body.session_id;
    const ip = request.ip;

    const isFirst = !request.user || !(await db.from('users').select('first_free_run_used_at').eq('id', request.user.id).maybeSingle()).data?.first_free_run_used_at;

    const { runId, sessionId: sid } = await runs.createRun(
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
    );

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

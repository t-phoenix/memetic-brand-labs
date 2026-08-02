import type { FastifyInstance } from 'fastify';
import { usdcAddressForNetwork } from '../lib/chainAssets.js';
import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { BusinessConfigService } from '../services/BusinessConfigService.js';
import { SkuPricingService } from '../services/SkuPricingService.js';
import { ResultsEmailService } from '../services/ResultsEmailService.js';
import { AccessGateService } from '../services/AccessGateService.js';
import { EmailVerificationService } from '../services/EmailVerificationService.js';
import { X402PaymentService } from '../services/X402PaymentService.js';
import { PrivyAuthService } from '../services/PrivyAuthService.js';
import { PipelineService } from '../services/PipelineService.js';
import { IntakeSessionService } from '../services/IntakeSessionService.js';
import { RunService } from '../services/RunService.js';
import { apiError, emailDomain, isConsumerDomain } from '../lib/apiError.js';
import { sha256 } from '../utils/hash.js';
import { PaymentRequiredSent } from '../services/X402PaymentService.js';
import { normalizeModelTier } from '../services/SkuPricingService.js';
import { authOptional } from './auth.js';
import { formatDbError } from '../db/health.js';

export function createCommerceContext(env: Env) {
  const db = getSupabase(env);
  const config = new BusinessConfigService(db, env);
  const skuPricing = new SkuPricingService(db, config);
  const resultsEmail = new ResultsEmailService(db, env, config);
  const access = new AccessGateService(db);
  const runs = new RunService(db);
  const pipeline = new PipelineService(db, env);
  const emailVerification = new EmailVerificationService(db, env, config, access, pipeline);
  const x402 = new X402PaymentService(db, env, config, skuPricing, access);
  const privy = new PrivyAuthService(env);
  const intake = new IntakeSessionService(db, env, config, runs, access, pipeline);

  return { db, config, skuPricing, resultsEmail, access, emailVerification, x402, privy, runs, pipeline, intake };
}

export async function registerAccessRoutes(app: FastifyInstance, env: Env) {
  const ctx = createCommerceContext(env);
  const apiBase = env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`;

  app.get('/v1/auth/oauth-status', async (request) => {
    const user = await ctx.privy.authFromRequest(request, env);
    if (!user?.privyUserId) {
      return { authenticated: false, oauth_free_used: false, can_use_oauth: true };
    }
    return ctx.access.getOAuthStatus(user.privyUserId, user.email, ctx.config);
  });

  app.get('/v1/auth/email-status', async (request, reply) => {
    const { email } = request.query as { email?: string };
    const normalized = email?.trim().toLowerCase() ?? '';
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return reply.code(400).send({
        error: {
          code: 'invalid_email_format',
          message: 'Invalid email format',
          user_message: "That doesn't look like a valid email address.",
          retryable: true,
        },
      });
    }

    const domain = emailDomain(normalized);
    const blocklist = await ctx.config.consumerBlocklist();
    const consumerDomain = isConsumerDomain(domain, blocklist);
    const emailHash = sha256(normalized);
    const unlimited = await ctx.config.hasUnlimitedRunsForEmail(normalized);
    const emailFreeUsed = unlimited ? false : await ctx.access.hasEmailGrantForPrincipal(emailHash);

    return {
      email: normalized,
      email_free_used: emailFreeUsed,
      can_use_email: !emailFreeUsed && !consumerDomain,
      consumer_domain: consumerDomain,
    };
  });

  app.get('/v1/runs/:id/access-status', async (request) => {
    const { id } = request.params as { id: string };
    return ctx.access.getAccessStatus(id);
  });

  app.post('/v1/runs/:id/request-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    try {
      return await ctx.emailVerification.requestVerification(id, email);
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/runs/:id/resend-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    try {
      return await ctx.emailVerification.requestVerification(id, email, { resend: true });
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/runs/:id/confirm-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email, attempt_id } = request.body as { email: string; attempt_id?: string };
    try {
      return await ctx.emailVerification.confirmVerification(id, email, attempt_id);
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/runs/:id/unlock/oauth', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await ctx.privy.authFromRequest(request, env);
    if (!user?.privyUserId) {
      return reply.code(401).send({
        error: {
          code: 'oauth_required',
          message: 'Privy authentication required',
          user_message: 'Sign in with Google or Apple to unlock your results.',
          retryable: true,
          recovery_actions: [{ action: 'use_oauth', label: 'Sign in', method: 'oauth' }],
        },
      });
    }
    try {
      return await ctx.emailVerification.grantOAuthAccess(id, user.privyUserId, user.email);
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/runs/:id/unlock', async (request, reply) => {
    const { id } = request.params as { id: string };
    await authOptional(request, env);
    const body = (request.body as { recipient_email?: string; model_tier?: string }) ?? {};

    const { data: runRow } = await ctx.db.from('engine_runs').select('model_tier').eq('id', id).maybeSingle();
    const modelTier = (body.model_tier ?? runRow?.model_tier ?? 'fast') as 'fast' | 'standard' | 'quality';

    try {
      const payment = await ctx.x402.requirePayment(request, reply, {
        skuKey: 'human_unlock',
        modelTier,
        runId: id,
        userId: request.user?.id,
        resourcePath: `${apiBase}/v1/runs/${id}/unlock`,
        description: 'Unlock Narrative Engine results (4 direction cards)',
      });
      await ctx.x402.completeRunUnlock(id, payment, { recipientEmail: body.recipient_email });
      await ctx.pipeline.startPipeline(id);
      const outputs = await ctx.runs.getOutputs(id);
      return {
        unlocked: true,
        cards: outputs.cards,
        share_id: outputs.share_id,
      };
    } catch (e) {
      if (e instanceof PaymentRequiredSent) return;
      return sendApiError(reply, e);
    }
  });

  app.get('/v1/runs/:id/payment-status', async (request) => {
    const { id } = request.params as { id: string };
    const { attempt_id } = request.query as { attempt_id?: string };
    return ctx.x402.getPaymentStatus(id, attempt_id);
  });

  app.post('/v1/runs/:id/resend-results-email', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    const unlocked = await ctx.access.hasAccess(id);
    if (!unlocked) {
      return reply.code(403).send({ error: { code: 'access_required', message: 'Unlock required first' } });
    }
    await ctx.resultsEmail.resend(id, email);
    return { sent: true };
  });

  app.post('/v1/runs/:id/unlock/cancel', async (request) => {
    const { id } = request.params as { id: string };
    await ctx.db.from('engine_runs').update({ access_status: 'locked' }).eq('id', id);
    await ctx.db
      .from('access_attempts')
      .update({ status: 'cancelled' })
      .eq('run_id', id)
      .eq('status', 'pending');
    return { cancelled: true };
  });

  app.get('/v1/commerce/human-unlock-quote', async (request, reply) => {
    const { tier: tierFilter } = request.query as { tier?: string };
    const { data: skuRow } = await ctx.db.from('product_skus').select('*').eq('sku_key', 'human_unlock').maybeSingle();
    if (!skuRow) {
      return reply.code(503).send({ error: { code: 'sku_unavailable', message: 'SKU not available' } });
    }
    const network = await ctx.config.x402Network();
    const payTo = await ctx.config.x402PayTo();
    const { data: tierMeta } = await ctx.db.from('pricing_tiers').select('tier_key, label, price_usdc');
    const tierLabels = new Map((tierMeta ?? []).map((t) => [t.tier_key as string, t.label as string]));

    const tierPrices = await ctx.skuPricing.getTierPricesForSku('human_unlock');
    const tiers = tierPrices.map((t) => ({
      tier_key: t.tier_key,
      label: tierLabels.get(t.tier_key) ?? t.tier_key,
      price_usdc: t.price_usdc,
      amount_atomic: t.amount_atomic,
    }));

    const freeEmailModelTier = await ctx.config.getFreeEmailModelTier();
    const freeEmailTierLabel = tierLabels.get(freeEmailModelTier) ?? freeEmailModelTier;

    const selectedTier = tierFilter
      ? tiers.find((t) => t.tier_key === tierFilter) ?? tiers[0]
      : tiers[0];

    return {
      sku_key: 'human_unlock',
      label: skuRow.label as string,
      price_usdc: selectedTier?.price_usdc ?? tiers[0]?.price_usdc,
      amount_atomic: selectedTier?.amount_atomic ?? tiers[0]?.amount_atomic,
      tiers,
      free_email_model_tier: freeEmailModelTier,
      free_email_tier_label: freeEmailTierLabel,
      network,
      chain_name: network === 'eip155:8453' ? 'Base' : network,
      asset: 'USDC',
      asset_address: usdcAddressForNetwork(network),
      pay_to: payTo ?? null,
      payment_enabled: Boolean(payTo),
      resource_path: `${apiBase}/v1/narrative-runs/start`,
      description: 'Narrative Engine analysis (4 direction cards)',
    };
  });

  app.post('/v1/intake-sessions', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const sessionId = (request.headers['x-session-id'] as string) ?? body.session_id;
    try {
      return await ctx.intake.createSession(
        {
          building: body.building,
          audience: body.audience,
          challenge: body.challenge,
          differentiation: body.differentiation,
          website: body.website,
          model_tier: (body.model_tier as 'fast' | 'standard' | 'quality') ?? 'fast',
          session_id: sessionId,
        },
        sessionId,
      );
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/intake-sessions/:id/request-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    try {
      return await ctx.intake.requestEmailVerification(id, email);
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/intake-sessions/:id/resend-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    try {
      return await ctx.intake.requestEmailVerification(id, email, { resend: true });
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/intake-sessions/:id/confirm-email-verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email, attempt_id } = request.body as { email: string; attempt_id?: string };
    try {
      return await ctx.intake.confirmEmailAndStart(id, email, attempt_id);
    } catch (e) {
      return sendApiError(reply, e);
    }
  });

  app.post('/v1/narrative-runs/start', async (request, reply) => {
    await authOptional(request, env);
    const body = request.body as Record<string, string>;
    const sessionId = (request.headers['x-session-id'] as string) ?? body.session_id;
    const intake = {
      building: body.building,
      audience: body.audience,
      challenge: body.challenge,
      differentiation: body.differentiation,
      website: body.website,
      model_tier: normalizeModelTier(body.model_tier, 'fast'),
      session_id: sessionId,
    };

    const authMethod = body.auth_method ?? (request.headers.authorization ? 'oauth' : 'x402');

    if (authMethod === 'oauth') {
      const user = await ctx.privy.authFromRequest(request, env);
      if (!user?.privyUserId) {
        return reply.code(401).send({
          error: {
            code: 'oauth_required',
            message: 'Privy authentication required',
            user_message: 'Sign in with Google or Apple to start your analysis.',
            retryable: true,
            recovery_actions: [{ action: 'use_oauth', label: 'Sign in', method: 'oauth' }],
          },
        });
      }
      try {
        if (await ctx.access.isOAuthFreeUnlockBlocked(user.privyUserId, user.email, ctx.config)) {
          return reply.code(403).send({
            error: {
              code: 'oauth_free_used',
              message: 'OAuth free unlock already used',
              user_message:
                'Your free Google sign-in was already used on another analysis. Pay with USDC to start a new one.',
              retryable: false,
              recovery_actions: [{ action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' }],
            },
          });
        }
        const isFirst =
          !request.user ||
          !(await ctx.db.from('users').select('first_free_run_used_at').eq('id', request.user.id).maybeSingle()).data
            ?.first_free_run_used_at;
        const oauthTier = await ctx.config.getFreeOAuthModelTier();
        return await ctx.intake.startRunFromIntake(
          { ...intake, model_tier: oauthTier },
          {
            userId: request.user?.id,
            grantType: 'oauth',
            principalType: 'privy_user',
            principalId: user.privyUserId,
            recipientEmail: user.email,
            unlockMethod: 'oauth',
            isFirstRun: isFirst,
            metadata: { email: user.email },
          },
        );
      } catch (e) {
        return sendApiError(reply, e);
      }
    }

    // x402 payment path
    try {
      const paymentHeader =
        (request.headers['payment-signature'] as string) ??
        (request.headers['x-payment'] as string) ??
        (request.headers.payment as string);

      const payment = await ctx.x402.requirePayment(request, reply, {
        skuKey: 'human_unlock',
        modelTier: intake.model_tier,
        userId: request.user?.id,
        resourcePath: `${apiBase}/v1/narrative-runs/start`,
        description: 'Narrative Engine analysis (4 direction cards)',
      });

      const isFirst =
        !request.user ||
        !(await ctx.db.from('users').select('first_free_run_used_at').eq('id', request.user.id).maybeSingle()).data
          ?.first_free_run_used_at;

      const sku = await ctx.skuPricing.getSku('human_unlock', intake.model_tier);
      const payTo = await ctx.config.x402PayTo();

      const result = await ctx.intake.startRunFromIntake(intake, {
        userId: request.user?.id,
        grantType: 'x402_payment',
        principalType: 'wallet',
        principalId: payment.paid ? payment.payerAddress : 'dev_bypass',
        paymentTxId: payment.paid && 'paymentTxId' in payment ? payment.paymentTxId : undefined,
        unlockMethod: 'devBypass' in payment && payment.devBypass ? 'x402_dev_bypass' : 'x402_payment',
        isFirstRun: isFirst,
        metadata: payment.paid ? { tx_hash: payment.txHash } : { dev_bypass: true },
      });

      if (payment.paid) {
        let paymentTxId = 'paymentTxId' in payment ? payment.paymentTxId : undefined;
        if ('deferredRecord' in payment && payment.deferredRecord && paymentHeader && sku && payTo) {
          paymentTxId = await ctx.x402.recordPaymentForRun(result.run_id, {
            idempotencyKey: payment.idempotencyKey,
            payerAddress: payment.payerAddress,
            payTo,
            amountUsdc: sku.price_usdc,
            skuKey: sku.sku_key,
            paymentHeader,
            userId: request.user?.id,
          });
        }
        await ctx.db.from('engine_runs').update({ payer_wallet: payment.payerAddress }).eq('id', result.run_id);
        if (paymentTxId) {
          await ctx.db.from('run_access_grants').update({ payment_tx_id: paymentTxId }).eq('run_id', result.run_id);
        }
      }

      return result;
    } catch (e) {
      if (e instanceof PaymentRequiredSent) return;
      return sendApiError(reply, e);
    }
  });
}

function sendApiError(reply: import('fastify').FastifyReply, e: unknown) {
  if (e && typeof e === 'object' && 'body' in e && 'statusCode' in e) {
    const err = e as { statusCode: number; body: unknown };
    return reply.code(err.statusCode).send(err.body);
  }
  const message = formatDbError(e);
  if (message.includes('narrative_intake_sessions') || message.includes('PGRST205')) {
    return reply.code(503).send({
      error: {
        code: 'database_schema_outdated',
        message,
        user_message: 'Server database is missing a required migration. Run supabase db push.',
        retryable: false,
      },
    });
  }
  if (e && typeof e === 'object' && 'code' in e) {
    return reply.code(500).send({
      error: {
        code: 'database_error',
        message,
        user_message: 'Something went wrong. Please try again.',
        retryable: true,
      },
    });
  }
  throw e;
}

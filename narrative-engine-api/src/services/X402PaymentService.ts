import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../config/env.js';
import type { BusinessConfigService } from './BusinessConfigService.js';
import type { SkuPricingService, ModelTierKey } from './SkuPricingService.js';
import { normalizeModelTier } from './SkuPricingService.js';
import type { AccessGateService } from './AccessGateService.js';
import { apiError } from '../lib/apiError.js';
import { usdcAddressForNetwork } from '../lib/chainAssets.js';
import { syncRunRevenue } from '../telemetry/TelemetryService.js';

export type PaymentResult =
  | { paid: true; payerAddress: string; txHash: string; paymentTxId: string; idempotencyKey: string }
  | { paid: true; payerAddress: string; txHash: string; idempotencyKey: string; paymentTxId?: string; deferredRecord: true }
  | { paid: false; devBypass: true };

export type DeferredPaymentRecord = {
  idempotencyKey: string;
  payerAddress: string;
  payTo: string;
  amountUsdc: number;
  skuKey: string;
  paymentHeader: string;
  userId?: string;
};

export class X402PaymentService {
  private resourceServer: unknown = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
    private readonly config: BusinessConfigService,
    private readonly skuPricing: SkuPricingService,
    private readonly access: AccessGateService,
  ) {}

  private async ensureInit() {
    if (this.resourceServer) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const { HTTPFacilitatorClient, x402ResourceServer } = await import('@x402/core/server');
        const { ExactEvmScheme } = await import('@x402/evm/exact/server');
        const [facilitatorUrl, network] = await Promise.all([
          this.config.x402FacilitatorUrl(),
          this.config.x402Network(),
        ]);
        const client = new HTTPFacilitatorClient({ url: facilitatorUrl });
        const server = new x402ResourceServer(client).register(network as never, new ExactEvmScheme());
        await server.initialize();
        const supported = server.getSupportedKind(2, network as never, 'exact');
        if (!supported) {
          throw apiError('facilitator_network_unsupported', `Facilitator does not support ${network}`, {
            statusCode: 503,
            userMessage:
              network === 'eip155:8453'
                ? 'USDC payments on Base mainnet require a mainnet facilitator. Set X402_FACILITATOR_URL=https://facilitator.xpay.sh'
                : `Payment facilitator does not support ${network}. Check x402.network and X402_FACILITATOR_URL.`,
            retryable: false,
          });
        }
        this.resourceServer = server;
      })();
    }
    await this.initPromise;
  }

  async requirePayment(
    request: FastifyRequest,
    reply: FastifyReply,
    opts: {
      skuKey: string;
      modelTier?: ModelTierKey | string;
      runId?: string;
      userId?: string;
      resourcePath: string;
      description: string;
    },
  ): Promise<PaymentResult> {
    const modelTier = normalizeModelTier(opts.modelTier);
    const sku = await this.skuPricing.getSku(opts.skuKey, modelTier);
    if (!sku || !sku.is_active) {
      throw apiError('sku_unavailable', 'Product SKU not available', { statusCode: 503 });
    }

    const payTo = await this.config.x402PayTo();
    if (!payTo) {
      return { paid: false, devBypass: true };
    }

    const network = await this.config.x402Network();
    const amountAtomic = this.skuPricing.usdcToAtomic(sku.price_usdc);
    const paymentHeader =
      (request.headers['payment-signature'] as string) ??
      (request.headers['x-payment'] as string) ??
      (request.headers.payment as string);

    const idempotencyKey =
      (request.headers['idempotency-key'] as string) ??
      (request.headers['payment-identifier'] as string) ??
      randomUUID();

    if (!paymentHeader) {
      await this.recordPaymentAttempt(opts, sku.sku_key, sku.price_usdc, 'initiated', idempotencyKey);
      if (opts.runId) {
        await this.db.from('engine_runs').update({ access_status: 'payment_pending' }).eq('id', opts.runId);
      }

      const accepts = [
        {
          scheme: 'exact',
          network,
          payTo,
          amount: amountAtomic,
          asset: usdcAddressForNetwork(network),
          maxTimeoutSeconds: 300,
          extra: { name: 'USD Coin', version: '2' },
        },
      ];

      const extensions = await this.bazaarExtension(sku, opts);
      const body = {
        x402Version: 2,
        error: { code: 'payment_required', message: 'USDC payment required' },
        accepts,
        resource: opts.resourcePath,
        description: opts.description,
        model_tier: modelTier,
        price_usdc: sku.price_usdc,
        ...(Object.keys(extensions).length > 0 ? { extensions } : {}),
      };

      const { encodePaymentRequiredHeader } = await import('@x402/core/http');
      reply.header('PAYMENT-REQUIRED', encodePaymentRequiredHeader(body as never));
      reply.code(402).send(body);
      throw new PaymentRequiredSent();
    }

    let payerAddress: string;
    try {
      payerAddress = await this.verifyAndSettle(paymentHeader, {
        network,
        payTo,
        amount: amountAtomic,
        resource: opts.resourcePath,
      });
    } catch (e) {
      await this.recordPaymentAttempt(opts, sku.sku_key, sku.price_usdc, 'failed', idempotencyKey);
      if (opts.runId) {
        await this.db
          .from('engine_runs')
          .update({ access_status: 'locked', access_failure_code: 'payment_verification_failed' })
          .eq('id', opts.runId);
      }
      throw e;
    }

    const { data: existing } = await this.db
      .from('payment_transactions')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing?.id) {
      return {
        paid: true,
        payerAddress: payerAddress ?? 'unknown',
        txHash: idempotencyKey,
        paymentTxId: existing.id as string,
        idempotencyKey,
      };
    }

    if (!opts.runId) {
      await this.recordPaymentAttempt(opts, sku.sku_key, sku.price_usdc, 'succeeded', idempotencyKey);
      return {
        paid: true,
        payerAddress: payerAddress ?? 'unknown',
        txHash: idempotencyKey,
        idempotencyKey,
        deferredRecord: true,
      };
    }

    const paymentTxId = await this.insertPaymentTransaction({
      runId: opts.runId,
      userId: opts.userId,
      skuKey: sku.sku_key,
      amountUsdc: sku.price_usdc,
      payerAddress: payerAddress ?? 'unknown',
      payTo,
      paymentHeader,
      idempotencyKey,
    });

    await this.recordPaymentAttempt(opts, sku.sku_key, sku.price_usdc, 'succeeded', idempotencyKey);
    await syncRunRevenue(this.db, opts.runId, sku.price_usdc);

    return {
      paid: true,
      payerAddress: payerAddress ?? 'unknown',
      txHash: idempotencyKey,
      paymentTxId,
      idempotencyKey,
    };
  }

  /** Persist a verified pre-run payment once the engine run row exists. */
  async recordPaymentForRun(runId: string, record: DeferredPaymentRecord): Promise<string> {
    const { data: existing } = await this.db
      .from('payment_transactions')
      .select('id')
      .eq('idempotency_key', record.idempotencyKey)
      .maybeSingle();

    if (existing?.id) {
      await this.db.from('payment_transactions').update({ run_id: runId }).eq('id', existing.id);
      await this.db
        .from('payment_attempts')
        .update({ run_id: runId, status: 'succeeded' })
        .eq('idempotency_key', record.idempotencyKey);
      return existing.id as string;
    }

    const paymentTxId = await this.insertPaymentTransaction({
      runId,
      userId: record.userId,
      skuKey: record.skuKey,
      amountUsdc: record.amountUsdc,
      payerAddress: record.payerAddress,
      payTo: record.payTo,
      paymentHeader: record.paymentHeader,
      idempotencyKey: record.idempotencyKey,
    });

    await this.db
      .from('payment_attempts')
      .update({ run_id: runId, status: 'succeeded' })
      .eq('idempotency_key', record.idempotencyKey);

    await syncRunRevenue(this.db, runId, record.amountUsdc);
    return paymentTxId;
  }

  private async insertPaymentTransaction(opts: {
    runId: string;
    userId?: string;
    skuKey: string;
    amountUsdc: number;
    payerAddress: string;
    payTo: string;
    paymentHeader: string;
    idempotencyKey: string;
  }): Promise<string> {
    const { data: tx, error } = await this.db
      .from('payment_transactions')
      .insert({
        run_id: opts.runId,
        user_id: opts.userId ?? null,
        amount_usdc: opts.amountUsdc,
        payer_address: opts.payerAddress,
        payee_address: opts.payTo,
        tx_hash: opts.idempotencyKey.slice(0, 64),
        facilitator: await this.config.x402FacilitatorUrl(),
        status: 'confirmed',
        sku_key: opts.skuKey,
        payment_signature: String(opts.paymentHeader).slice(0, 2048),
        idempotency_key: opts.idempotencyKey,
      })
      .select('id')
      .single();

    if (error) throw error;
    return tx!.id as string;
  }

  async completeRunUnlock(
    runId: string,
    payment: PaymentResult,
    opts?: { recipientEmail?: string },
  ) {
    if ('devBypass' in payment && payment.devBypass) {
      await this.access.grantAccess({
        runId,
        grantType: 'x402_payment',
        recipientEmail: opts?.recipientEmail,
        unlockMethod: 'x402_dev_bypass',
        metadata: { dev_bypass: true },
      });
      return;
    }
    if (!payment.paid) return;

    await this.access.grantAccess({
      runId,
      grantType: 'x402_payment',
      principalType: 'wallet',
      principalId: payment.payerAddress,
      paymentTxId: payment.paymentTxId,
      recipientEmail: opts?.recipientEmail,
      unlockMethod: 'x402_payment',
      metadata: { tx_hash: payment.txHash },
    });

    await this.db.from('engine_runs').update({ payer_wallet: payment.payerAddress }).eq('id', runId);
  }

  async getPaymentStatus(runId: string, attemptId?: string) {
    let q = this.db.from('payment_attempts').select('*').eq('run_id', runId).order('created_at', { ascending: false });
    if (attemptId) q = q.eq('idempotency_key', attemptId);
    const { data } = await q.limit(1).maybeSingle();

    const { data: tx } = await this.db
      .from('payment_transactions')
      .select('status, failure_code, amount_usdc')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: run } = await this.db
      .from('engine_runs')
      .select('access_status, pipeline_enqueued_at, status')
      .eq('id', runId)
      .maybeSingle();

    const status = tx?.status === 'confirmed' ? 'confirmed' : data?.status === 'succeeded' ? 'confirmed' : 'pending';
    return {
      status,
      failure_code: tx?.failure_code ?? data?.failure_code,
      amount_usdc: tx?.amount_usdc,
      access_status: run?.access_status ?? null,
      pipeline_started: Boolean(run?.pipeline_enqueued_at),
      pipeline_status: run?.status ?? null,
      recovery_actions:
        status === 'confirmed'
          ? []
          : [
              { action: 'retry_payment', label: 'Retry payment', method: 'x402' as const },
              { action: 'use_oauth', label: 'Use Google instead', method: 'oauth' as const },
            ],
    };
  }

  private async decodePaymentHeader(paymentHeader: string): Promise<Record<string, unknown>> {
    const { decodePaymentSignatureHeader } = await import('@x402/core/http');
    try {
      return decodePaymentSignatureHeader(paymentHeader) as Record<string, unknown>;
    } catch {
      try {
        return JSON.parse(paymentHeader) as Record<string, unknown>;
      } catch {
        throw apiError('invalid_payment_header', 'Invalid payment signature header', {
          statusCode: 400,
          userMessage: 'Payment signature could not be read. Please try again.',
          retryable: true,
        });
      }
    }
  }

  private async verifyAndSettle(
    paymentHeader: string,
    req: { network: string; payTo: string; amount: string; resource: string },
  ): Promise<string> {
    await this.ensureInit();
    const server = this.resourceServer as {
      verifyPayment: (
        payload: unknown,
        requirements: unknown,
      ) => Promise<{ isValid: boolean; invalidReason?: string; payer?: string }>;
      settlePayment: (
        payload: unknown,
        requirements: unknown,
      ) => Promise<{ success: boolean; errorReason?: string; payer?: string }>;
    };

    const payload = await this.decodePaymentHeader(paymentHeader);
    const requirements =
      (payload as { accepted?: Record<string, unknown> }).accepted ??
      ({
        scheme: 'exact',
        network: req.network,
        payTo: req.payTo,
        amount: req.amount,
        asset: usdcAddressForNetwork(req.network),
        maxTimeoutSeconds: 300,
        resource: req.resource,
      } as const);

    const verifyResult = await server.verifyPayment(payload, requirements);
    if (!verifyResult.isValid) {
      throw apiError('payment_verification_failed', verifyResult.invalidReason ?? 'Payment verification failed', {
        statusCode: 402,
        userMessage: 'We could not verify your USDC payment. Please try again.',
        retryable: true,
        recoveryActions: [
          { action: 'retry_payment', label: 'Retry payment', method: 'x402' },
          { action: 'use_oauth', label: 'Use Google instead', method: 'oauth' },
        ],
      });
    }

    const settleResult = await server.settlePayment(payload, requirements);
    if (!settleResult.success) {
      throw apiError('payment_settlement_failed', settleResult.errorReason ?? 'Payment settlement failed', {
        statusCode: 402,
        userMessage: 'Your payment was signed but could not be settled. Please try again.',
        retryable: true,
        recoveryActions: [
          { action: 'retry_payment', label: 'Retry payment', method: 'x402' },
          { action: 'use_oauth', label: 'Use Google instead', method: 'oauth' },
        ],
      });
    }

    return verifyResult.payer ?? settleResult.payer ?? 'unknown';
  }

  private async bazaarExtension(sku: { sku_key: string; label: string; output_scope: string }, opts: { description: string }) {
    const enabled = await this.config.get<boolean>('discovery.bazaar_enabled', true);
    if (!enabled) return {};
    try {
      const { declareDiscoveryExtension } = await import('@x402/extensions/bazaar');
      return {
        bazaar: declareDiscoveryExtension({
          input: { output_scope: sku.output_scope },
          inputSchema: {
            type: 'object',
            properties: {
              building: { type: 'string' },
              audience: { type: 'string' },
              challenge: { type: 'string' },
              differentiation: { type: 'string' },
              website: { type: 'string' },
              output_scope: { type: 'string', enum: ['cards', 'full_pipeline'] },
            },
            required: ['building', 'audience', 'challenge', 'differentiation'],
          },
          output: {
            example: { cards: [{ key: 'clear_explanation', label: 'Clear Explanation', content: '...' }] },
          },
        }),
      };
    } catch {
      return {};
    }
  }

  private async recordPaymentAttempt(
    opts: { runId?: string; userId?: string },
    skuKey: string,
    amount: number,
    status: string,
    idempotencyKey: string,
  ) {
    await this.db.from('payment_attempts').insert({
      run_id: opts.runId ?? null,
      user_id: opts.userId ?? null,
      sku_key: skuKey,
      amount_usdc: amount,
      status,
      idempotency_key: idempotencyKey,
    });
  }
}

export class PaymentRequiredSent extends Error {
  constructor() {
    super('402 sent');
    this.name = 'PaymentRequiredSent';
  }
}

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { createCommerceContext } from './access.js';
import { enqueueRun } from '../jobs/queue.js';
import { PaymentRequiredSent } from '../services/X402PaymentService.js';
import { apiError } from '../lib/apiError.js';
import { usdcAddressForNetwork } from '../lib/chainAssets.js';
import { normalizeModelTier } from '../services/SkuPricingService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AGENT_SKU_KEYS = ['agent_cards', 'agent_full'] as const;

export async function registerAgentRoutes(app: FastifyInstance, env: Env) {
  const ctx = createCommerceContext(env);
  const apiBase = env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`;

  app.get('/llms.txt', async (_request, reply) => {
    const text = await buildApiLlmsTxt(apiBase, ctx);
    reply.header('Content-Type', 'text/plain; charset=utf-8').send(text);
  });

  app.get('/.well-known/x402', async () => ({
    capabilities: `${apiBase}/v1/capabilities`,
    openapi: `${apiBase}/openapi.json`,
    llms: `${apiBase}/llms.txt`,
  }));

  app.get('/v1/capabilities', async () => {
    const serviceName = await ctx.config.get<string>('discovery.service_name', 'MBL Narrative Engine');
    const tags = await ctx.config.get<string[]>('discovery.tags', ['brand', 'positioning', 'narrative']);
    const [network, facilitatorUrl, payTo, bazaarEnabled] = await Promise.all([
      ctx.config.x402Network(),
      ctx.config.x402FacilitatorUrl(),
      ctx.config.x402PayTo(),
      ctx.config.get<boolean>('discovery.bazaar_enabled', true),
    ]);

    const activeAgentKeys: string[] = [];
    for (const key of AGENT_SKU_KEYS) {
      if (await ctx.config.isSkuX402Enabled(key)) activeAgentKeys.push(key);
    }

    const skus = (
      await Promise.all(activeAgentKeys.map((key) => ctx.skuPricing.getSku(key)))
    ).filter((s): s is NonNullable<typeof s> => s != null && s.is_active);

    const products = await Promise.all(
      activeAgentKeys.map(async (skuKey) => {
        const sku = skus.find((s) => s.sku_key === skuKey);
        if (!sku) return null;
        const model_tiers = await ctx.skuPricing.getTierPricesForSku(skuKey);
        return {
          sku: sku.sku_key,
          label: sku.label,
          price_usdc: sku.price_usdc,
          output_scope: sku.output_scope,
          route: sku.x402_route_template,
          bazaar_metadata: sku.bazaar_metadata ?? {},
          model_tiers,
        };
      }),
    );

    const agentX402Available = products.filter(Boolean).length > 0 && Boolean(payTo);

    return {
      service: serviceName,
      description:
        'Brand positioning and narrative analysis for emerging technology companies. Returns four narrative direction cards or full pipeline diagnostics.',
      version: 'ne-v1.0.0',
      protocols: agentX402Available ? ['x402', 'http'] : ['http'],
      openapi: `${apiBase}/openapi.json`,
      llms: `${apiBase}/llms.txt`,
      tags,
      ...(agentX402Available
        ? {
            payment: {
              protocol: 'x402',
              x402_version: 2,
              network,
              asset: usdcAddressForNetwork(network),
              asset_symbol: 'USDC',
              facilitator_url: facilitatorUrl,
              pay_to: payTo || null,
              payment_headers: ['payment-signature', 'x-payment', 'payment'],
              bazaar_extension: bazaarEnabled,
              flow: 'POST without payment header → 402 with accepts[] → retry with payment-signature header',
            },
          }
        : {}),
      products: products.filter(Boolean),
      usage: {
        create:
          'POST /v1/agent/analyze with brand intake fields, output_scope (cards|full_pipeline), and optional model_tier (fast|standard|quality)',
        model_tier:
          'Pass model_tier in the analyze body. The 402 payment amount matches the tier price from GET /v1/capabilities products[].model_tiers',
        poll: 'GET /v1/agent/runs/:id until status=completed',
        outputs: 'GET /v1/agent/runs/:id/outputs?scope=cards|full',
      },
    };
  });

  app.get('/openapi.json', async (_request, reply) => {
    try {
      const path = join(__dirname, '../../../docs/narrative-engine/openapi.yaml');
      const yaml = readFileSync(path, 'utf8');
      const json = parseYaml(yaml);
      reply.header('Content-Type', 'application/json').send(json);
    } catch {
      reply.code(404).send({ error: { code: 'not_found', message: 'OpenAPI spec not found' } });
    }
  });

  app.get('/openapi.yaml', async (_request, reply) => {
    try {
      const path = join(__dirname, '../../../docs/narrative-engine/openapi.yaml');
      const yaml = readFileSync(path, 'utf8');
      reply.header('Content-Type', 'text/yaml').send(yaml);
    } catch {
      reply.code(404).send({ error: { code: 'not_found', message: 'OpenAPI spec not found' } });
    }
  });

  app.post('/v1/agent/analyze', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const outputScope = (body.output_scope === 'full_pipeline' ? 'full_pipeline' : 'cards') as 'cards' | 'full_pipeline';
    const skuKey = outputScope === 'full_pipeline' ? 'agent_full' : 'agent_cards';
    const modelTier = normalizeModelTier(body.model_tier, 'fast');

    if (!(await ctx.config.isSkuX402Enabled(skuKey))) {
      return reply.code(503).send({
        error: {
          code: 'sku_unavailable',
          message: 'Product SKU not available',
          user_message: 'This agent product is temporarily unavailable.',
          retryable: false,
        },
      });
    }

    try {
      const payment = await ctx.x402.requirePayment(request, reply, {
        skuKey,
        modelTier,
        resourcePath: `${apiBase}/v1/agent/analyze`,
        description: `Agent analyze (${outputScope}, ${modelTier})`,
      });

      const { runId, sessionId } = await ctx.runs.createRun(
        {
          building: body.building,
          audience: body.audience,
          challenge: body.challenge,
          differentiation: body.differentiation,
          website: body.website,
          model_tier: modelTier,
          session_id: body.session_id,
        },
        {
          paymentStatus: 'paid',
          isFirstRun: false,
          runSource: 'agent',
        },
      );

      if (payment.paid) {
        await ctx.access.grantAccess({
          runId,
          grantType: 'x402_payment',
          outputScope: outputScope,
          principalType: 'wallet',
          principalId: payment.payerAddress,
          paymentTxId: payment.paymentTxId,
          unlockMethod: 'x402_payment',
        });
        await ctx.db.from('engine_runs').update({
          output_scope_requested: outputScope,
          payer_wallet: payment.payerAddress,
        }).eq('id', runId);
      } else if ('devBypass' in payment) {
        await ctx.access.grantAccess({
          runId,
          grantType: 'admin_override',
          outputScope: outputScope,
          unlockMethod: 'x402_dev_bypass',
          metadata: { agent: true },
        });
      }

      enqueueRun(env, runId);
      return reply.code(201).send({
        run_id: runId,
        session_id: sessionId,
        status: 'pending',
        output_scope: outputScope,
        poll_url: `/v1/agent/runs/${runId}`,
      });
    } catch (e) {
      if (e instanceof PaymentRequiredSent) return;
      if (e && typeof e === 'object' && 'body' in e) {
        const err = e as { statusCode: number; body: unknown };
        return reply.code(err.statusCode).send(err.body);
      }
      throw e;
    }
  });

  app.get('/v1/agent/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await ctx.runs.getRunStatus(id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    if (run.run_source !== 'agent') {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Not an agent run' } });
    }
    return {
      id: run.id,
      status: run.status,
      current_stage: run.current_stage,
      progress_pct: run.progress_pct,
      output_scope: run.output_scope_requested ?? 'cards',
    };
  });

  app.get('/v1/agent/runs/:id/outputs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { scope } = request.query as { scope?: string };
    const run = await ctx.runs.getRunStatus(id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    if (run.status !== 'completed') {
      return reply.code(409).send({
        error: {
          code: 'run_not_ready',
          message: 'Run not complete',
          user_message: 'Analysis still in progress. Poll GET /v1/agent/runs/:id until status is completed.',
          retryable: true,
        },
      });
    }

    const outputScope = scope === 'full' || scope === 'full_pipeline' ? 'full_pipeline' : 'cards';
    const hasAccess = await ctx.access.hasAccess(id, outputScope);
    if (!hasAccess) {
      throw apiError('payment_required', 'Payment required for this output scope', { statusCode: 402 });
    }

    const outputs = await ctx.runs.getOutputs(id);
    const response: Record<string, unknown> = { cards: outputs.cards, share_id: outputs.share_id };

    if (outputScope === 'full_pipeline') {
      const { data: layers } = await ctx.db.from('layer_outputs').select('layer_key, output').eq('run_id', id);
      const { data: website } = await ctx.db.from('website_extractions').select('*').eq('run_id', id).maybeSingle();
      response.layers = Object.fromEntries((layers ?? []).map((l) => [l.layer_key, l.output]));
      if (website) {
        response.website_extraction = website.extraction;
        response.mismatch_flags = website.mismatch_flags;
      }
    }

    return response;
  });
}

function buildApiLlmsTxt(
  apiBase: string,
  ctx: Awaited<ReturnType<typeof createCommerceContext>>,
) {
  return (async () => {
    const activeKeys: string[] = [];
    for (const key of AGENT_SKU_KEYS) {
      if (await ctx.config.isSkuX402Enabled(key)) activeKeys.push(key);
    }
    const payTo = await ctx.config.x402PayTo();
    const agentX402Available = activeKeys.length > 0 && Boolean(payTo);

    const productLines: string[] = [];
    if (activeKeys.includes('agent_cards')) {
      productLines.push(
        '- output_scope=cards — four narrative direction cards',
        '  - fast: ~$0.25 USDC | standard: ~$0.50 | quality: ~$1.00',
      );
    }
    if (activeKeys.includes('agent_full')) {
      productLines.push(
        '- output_scope=full_pipeline — cards + L1–L6 layer diagnostics JSON',
        '  - fast: ~$2.50 | standard: ~$5.00 | quality: ~$10.00',
      );
    }

    const paymentNote = agentX402Available
      ? '> Machine-readable brand positioning analysis for AI agents. Pay-per-call with USDC on Base (x402).'
      : '> Machine-readable brand positioning analysis for AI agents. Agent x402 payments are temporarily disabled — see GET /v1/capabilities for availability.';

    const flowSection = agentX402Available
      ? `## Agent flow

1. GET ${apiBase}/v1/capabilities — list products, prices, payment metadata
2. POST ${apiBase}/v1/agent/analyze — without payment header returns 402 + x402 accepts[]
3. Retry POST with \`payment-signature\` (or \`x-payment\` / \`payment\`) header after wallet payment
4. Poll GET ${apiBase}/v1/agent/runs/{run_id} until status=completed
5. GET ${apiBase}/v1/agent/runs/{run_id}/outputs?scope=cards|full`
      : `## Agent flow

Agent x402 checkout is currently disabled. Poll OpenAPI and capabilities for when products return.`;

    return `# MBL Narrative Engine API

${paymentNote}

## Discovery

- Capabilities: ${apiBase}/v1/capabilities
- OpenAPI: ${apiBase}/openapi.json
- x402 well-known: ${apiBase}/.well-known/x402

${flowSection}

## Products (model_tier affects price — see GET /v1/capabilities)

${productLines.length ? productLines.join('\n') : '- No agent products are currently available for x402 checkout.'}

## Required body fields

building, audience, challenge, differentiation; optional website, output_scope, model_tier (fast|standard|quality; default fast)

## Example

POST ${apiBase}/v1/agent/analyze
{
  "building": "...",
  "audience": "...",
  "challenge": "...",
  "differentiation": "...",
  "output_scope": "cards",
  "model_tier": "quality"
}
`;
  })();
}

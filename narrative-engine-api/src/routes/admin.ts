import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import type { LayerKey } from '../types/index.js';
import { getSupabase } from '../db/client.js';
import { AdminService } from '../services/AdminService.js';
import { AdminPlaygroundService } from '../services/AdminPlaygroundService.js';
import { requireAdmin } from './auth.js';
import { createCommerceContext } from './access.js';
import { normalizeModelTier } from '../services/SkuPricingService.js';

export async function registerAdminRoutes(app: FastifyInstance, env: Env) {
  const db = getSupabase(env);
  const admin = new AdminService(db, env);
  const playground = new AdminPlaygroundService(db, env);
  const commerce = createCommerceContext(env);

  const guard = (request: Parameters<typeof requireAdmin>[0]) => requireAdmin(request, env);

  app.get('/v1/admin/health', async (request) => {
    guard(request);
    return admin.getHealth();
  });

  app.get('/v1/admin/stats', async (request) => {
    guard(request);
    const q = request.query as { days?: string; include_test_runs?: string };
    const period = Math.min(90, Math.max(1, parseInt(q.days ?? '7', 10) || 7));
    const includeTest = q.include_test_runs === 'true' || q.include_test_runs === '1';
    return admin.getStats(period, includeTest);
  });

  app.get('/v1/admin/runs', async (request) => {
    guard(request);
    const q = request.query as { limit?: string; offset?: string; status?: string; q?: string; run_source?: string };
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '50', 10) || 50));
    const offset = Math.max(0, parseInt(q.offset ?? '0', 10) || 0);
    return admin.listRuns({ limit, offset, status: q.status, q: q.q, run_source: q.run_source });
  });

  app.get('/v1/admin/runs/:id', async (request, reply) => {
    guard(request);
    const { id } = request.params as { id: string };
    const run = await admin.getRun(id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    return run;
  });

  app.get('/v1/admin/runs/:id/layers', async (request) => {
    guard(request);
    const { id } = request.params as { id: string };
    return admin.getRunLayers(id);
  });

  app.get('/v1/admin/llm-requests', async (request, reply) => {
    guard(request);
    const { run_id } = request.query as { run_id?: string };
    if (!run_id) {
      return reply.code(400).send({ error: { code: 'bad_request', message: 'run_id query param required' } });
    }
    return admin.getLlmRequests(run_id);
  });

  app.get('/v1/admin/analytics/messaging-problems', async (request) => {
    guard(request);
    return admin.getAnalyticsMessaging();
  });

  app.get('/v1/admin/analytics/model-performance', async (request) => {
    guard(request);
    return admin.getAnalyticsModels();
  });

  app.get('/v1/admin/analytics/cogs-revenue', async (request) => {
    guard(request);
    const { days } = request.query as { days?: string };
    const period = Math.min(90, parseInt(days ?? '30', 10) || 30);
    return admin.getAnalyticsCogs(period);
  });

  app.get('/v1/admin/analytics/failures', async (request) => {
    guard(request);
    const { days } = request.query as { days?: string };
    const period = Math.min(90, parseInt(days ?? '30', 10) || 30);
    return admin.getAnalyticsFailures(period);
  });

  app.get('/v1/admin/reports/runs.csv', async (request, reply) => {
    guard(request);
    const q = request.query as { from?: string; to?: string; status?: string };
    const csv = await admin.exportRunsCsv(q);
    return reply.header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename="runs.csv"').send(csv);
  });

  app.get('/v1/admin/reports/costs.csv', async (request, reply) => {
    guard(request);
    const { days } = request.query as { days?: string };
    const period = Math.min(90, parseInt(days ?? '30', 10) || 30);
    const csv = await admin.exportCostsCsv(period);
    return reply.header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename="costs.csv"').send(csv);
  });

  app.post('/v1/admin/playground/runs', async (request) => {
    guard(request);
    return playground.createTestRun(request.body as Parameters<AdminPlaygroundService['createTestRun']>[0]);
  });

  app.post('/v1/admin/playground/runs/:id/run', async (request, reply) => {
    guard(request);
    const { id } = request.params as { id: string };
    try {
      return await playground.runPipeline(id, request.body as { mode: 'full' | 'from_layer'; from_layer?: LayerKey });
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({ error: { message: err.message } });
    }
  });

  app.post('/v1/admin/playground/runs/:id/layers/:layerKey/run', async (request, reply) => {
    guard(request);
    const { id, layerKey } = request.params as { id: string; layerKey: LayerKey };
    const body = (request.body as { force?: boolean; retry?: boolean }) ?? {};
    try {
      return await playground.runLayer(id, layerKey, body);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({ error: { message: err.message } });
    }
  });

  app.post('/v1/admin/playground/runs/:id/layers/:layerKey/preview', async (request, reply) => {
    guard(request);
    const { id, layerKey } = request.params as { id: string; layerKey: LayerKey };
    try {
      return await playground.previewLayer(id, layerKey);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({ error: { message: err.message } });
    }
  });

  app.post('/v1/admin/playground/runs/:id/layers/:layerKey/retry', async (request, reply) => {
    guard(request);
    const { id, layerKey } = request.params as { id: string; layerKey: LayerKey };
    try {
      return await playground.runLayer(id, layerKey, { retry: true, force: true });
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({ error: { message: err.message } });
    }
  });

  app.post('/v1/admin/playground/runs/:id/finalize', async (request, reply) => {
    guard(request);
    const { id } = request.params as { id: string };
    try {
      return await playground.finalize(id);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({ error: { message: err.message } });
    }
  });

  app.get('/v1/admin/config', async (request) => {
    guard(request);
    return admin.getConfig();
  });

  app.get('/v1/admin/patterns', async (request) => {
    guard(request);
    return admin.getPatterns();
  });

  app.get('/v1/admin/business-config', async (request) => {
    guard(request);
    return { config: await commerce.config.list() };
  });

  app.patch('/v1/admin/business-config/:key', async (request) => {
    guard(request);
    const { key } = request.params as { key: string };
    const { value, updated_by } = request.body as { value: unknown; updated_by?: string };
    await commerce.config.set(key, value, updated_by);
    return { config_key: key, updated: true };
  });

  app.get('/v1/admin/product-skus', async (request) => {
    guard(request);
    return { skus: await commerce.skuPricing.listSkus() };
  });

  app.patch('/v1/admin/product-skus/:sku_key', async (request) => {
    guard(request);
    const { sku_key } = request.params as { sku_key: string };
    const body = request.body as Record<string, unknown>;
    const sku = await commerce.skuPricing.updateSku(sku_key, body as never);
    return { sku };
  });

  app.get('/v1/admin/product-sku-tier-prices', async (request) => {
    guard(request);
    const prices = await commerce.skuPricing.listSkuTierPrices();
    const skus = await commerce.skuPricing.listSkus();
    return { prices, skus };
  });

  app.patch('/v1/admin/product-sku-tier-prices/:sku_key/:tier_key', async (request) => {
    guard(request);
    const { sku_key, tier_key } = request.params as { sku_key: string; tier_key: string };
    const { price_usdc } = request.body as { price_usdc: number };
    const row = await commerce.skuPricing.updateTierPrice(
      sku_key,
      normalizeModelTier(tier_key),
      Number(price_usdc),
    );
    return { price: row };
  });

  app.post('/v1/admin/runs/:id/grant-access', async (request) => {
    guard(request);
    const { id } = request.params as { id: string };
    const { output_scope } = (request.body as { output_scope?: string }) ?? {};
    await commerce.access.grantAccess({
      runId: id,
      grantType: 'admin_override',
      outputScope: output_scope === 'full_pipeline' ? 'full_pipeline' : 'cards',
      unlockMethod: 'admin_override',
    });
    return { granted: true };
  });

  app.post('/v1/admin/runs/:id/resend-results-email', async (request, reply) => {
    guard(request);
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    if (!email) return reply.code(400).send({ error: { message: 'email required' } });
    await commerce.resultsEmail.resend(id, email);
    return { sent: true };
  });
}

import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { AdminService } from '../services/AdminService.js';
import { requireAdmin } from './auth.js';

export async function registerAdminRoutes(app: FastifyInstance, env: Env) {
  const db = getSupabase(env);
  const admin = new AdminService(db, env);

  const guard = (request: Parameters<typeof requireAdmin>[0]) => requireAdmin(request, env);

  app.get('/v1/admin/health', async (request) => {
    guard(request);
    return admin.getHealth();
  });

  app.get('/v1/admin/stats', async (request) => {
    guard(request);
    const { days } = request.query as { days?: string };
    const period = Math.min(90, Math.max(1, parseInt(days ?? '7', 10) || 7));
    return admin.getStats(period);
  });

  app.get('/v1/admin/runs', async (request) => {
    guard(request);
    const q = request.query as { limit?: string; offset?: string; status?: string; q?: string };
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '50', 10) || 50));
    const offset = Math.max(0, parseInt(q.offset ?? '0', 10) || 0);
    return admin.listRuns({ limit, offset, status: q.status, q: q.q });
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

  app.get('/v1/admin/config', async (request) => {
    guard(request);
    return admin.getConfig();
  });

  app.get('/v1/admin/patterns', async (request) => {
    guard(request);
    return admin.getPatterns();
  });
}

import './polyfills.js';
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { loadEnv, parseCorsOrigins, resolveRedisUrl } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAccessRoutes } from './routes/access.js';
import { registerAgentRoutes } from './routes/agent.js';
import { startWorker } from './jobs/queue.js';

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: parseCorsOrigins(env.CORS_ORIGIN),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Id',
      'idempotency-key',
      'payment-identifier',
      'payment-signature',
      'x-payment',
      'payment',
      'PAYMENT-SIGNATURE',
      'X-PAYMENT',
    ],
    exposedHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE', 'X-PAYMENT-RESPONSE'],
  });
  await app.register(helmet);

  app.setErrorHandler((error: Error & { statusCode?: number; body?: unknown }, _request, reply) => {
    if (error.body) {
      return reply.code(error.statusCode ?? 400).send(error.body);
    }
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: {
        code: statusCode === 401 ? 'unauthorized' : 'internal_error',
        message: error.message,
        user_message: statusCode >= 500 ? 'Something went wrong. Please try again.' : error.message,
        retryable: statusCode >= 500,
      },
    });
  });

  await registerRoutes(app, env);
  await registerAccessRoutes(app, env);
  await registerAgentRoutes(app, env);
  await registerAdminRoutes(app, env);

  if (resolveRedisUrl(env) && env.WORKER_MODE) {
    startWorker(env);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

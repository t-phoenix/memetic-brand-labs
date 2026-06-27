import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { loadEnv } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { registerAdminRoutes } from './routes/admin.js';
import { startWorker } from './jobs/queue.js';

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN.split(','), credentials: true });
  await app.register(helmet);

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: {
        code: statusCode === 401 ? 'unauthorized' : 'internal_error',
        message: error.message,
        retryable: statusCode >= 500,
      },
    });
  });

  await registerRoutes(app, env);
  await registerAdminRoutes(app, env);

  if (env.REDIS_URL && env.WORKER_MODE) {
    startWorker(env);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import 'dotenv/config';
import { loadEnv } from '../config/env.js';
import { startWorker } from './queue.js';

const env = loadEnv();
if (!env.REDIS_URL) {
  console.error('REDIS_URL required for worker');
  process.exit(1);
}
const worker = startWorker(env);
if (!worker) {
  console.error('Failed to start worker');
  process.exit(1);
}
console.log('Narrative Engine worker listening for jobs');
console.log('Narrative Engine worker started');

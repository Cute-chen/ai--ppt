import { env } from '../config/env';
import { createAppWorker } from './worker';
import { bootstrapSchema } from '../bootstrap/schema.bootstrap';

if (!env.queue.enabled) {
  console.log('[worker] queue disabled (QUEUE_ENABLED=false), worker not started');
  process.exit(0);
}

void (async () => {
  await bootstrapSchema();
  createAppWorker();
  console.log('[worker] started');
})().catch((error: Error) => {
  console.error('[worker] startup failed:', error.message);
  process.exit(1);
});

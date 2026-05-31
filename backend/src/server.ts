import app from './app';
import { env } from './config/env';
import { bootstrapAuthData } from './bootstrap/auth.bootstrap';
import { bootstrapSchema } from './bootstrap/schema.bootstrap';

const { port } = env;

const start = async (): Promise<void> => {
  await bootstrapSchema();
  await bootstrapAuthData();

  app.listen(port, () => {
    console.log(`[backend] server started at http://localhost:${port}`);
  });
};

start().catch((error: Error) => {
  console.error('[backend] startup failed:', error.message);
  process.exit(1);
});

import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startPurgeScheduler } from './services/purgeService.js';
import { runMigrations } from './db/runMigrations.js';

async function main() {
  await runMigrations();

  const app = createApp();
  const httpServer = createServer(app);

  initSockets(httpServer);
  startPurgeScheduler();

  httpServer.listen(env.port, () => {
    console.log(`estim8 server listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

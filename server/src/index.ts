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

  // Bind explicitly to 0.0.0.0: leaving the host unspecified defaults to the
  // IPv6 wildcard (::), which doesn't reliably accept IPv4 connections from a
  // sibling container (e.g. a reverse proxy) depending on the container's
  // network stack — a common cause of "logs say listening, proxy can't connect."
  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`estim8 server listening on 0.0.0.0:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'express-async-errors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Behind the nginx reverse proxy in production: trust one hop so req.ip and
  // rate limiting use the real client address from X-Forwarded-For.
  if (env.nodeEnv === 'production') app.set('trust proxy', 1);

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);

  const publicDir = join(__dirname, 'public');
  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (_req, res) => {
      res.sendFile(join(publicDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

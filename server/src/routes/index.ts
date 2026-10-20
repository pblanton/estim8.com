import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { cardDeckRouter } from './cardDecks.routes.js';
import { pokerSessionRouter } from './pokerSessions.routes.js';
import { topicRouter } from './topics.routes.js';
import { topicFileRouter } from './topicFiles.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/card-decks', cardDeckRouter);
apiRouter.use('/poker-sessions', pokerSessionRouter);
apiRouter.use(topicRouter);
apiRouter.use(topicFileRouter);

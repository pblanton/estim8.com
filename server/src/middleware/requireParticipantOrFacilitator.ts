import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE_NAME, resolveUserFromCookie } from '../services/authService.js';
import * as topicRepo from '../repositories/topicRepo.js';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import * as participantRepo from '../repositories/participantRepo.js';
import { sha256Hex } from '../utils/tokens.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      accessPokerSessionId?: string;
    }
  }
}

/**
 * Allows either the facilitator who owns the topic's session, or an anonymous
 * participant holding a valid participant token for that same session.
 */
export async function requireParticipantOrFacilitator(req: Request, res: Response, next: NextFunction) {
  const topicId = req.params.topicId;
  const topic = await topicRepo.findById(topicId);
  if (!topic) {
    res.status(404).json({ error: { code: 'not_found', message: 'Topic not found' } });
    return;
  }

  const authToken = req.cookies?.[AUTH_COOKIE_NAME];
  const user = await resolveUserFromCookie(authToken);
  if (user) {
    const session = await pokerSessionRepo.findById(topic.poker_session_id);
    if (session && session.facilitator_id === user.id) {
      req.accessPokerSessionId = topic.poker_session_id;
      next();
      return;
    }
  }

  const participantToken = (req.query.participantToken as string | undefined) ?? req.get('x-participant-token');
  if (participantToken) {
    const participant = await participantRepo.findByTokenHash(sha256Hex(participantToken));
    if (participant && participant.poker_session_id === topic.poker_session_id) {
      req.accessPokerSessionId = topic.poker_session_id;
      next();
      return;
    }
  }

  res.status(403).json({ error: { code: 'forbidden', message: 'Not authorized for this topic' } });
}

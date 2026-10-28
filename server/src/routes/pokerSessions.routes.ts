import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { HttpError } from '../middleware/errorHandler.js';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import * as cardDeckRepo from '../repositories/cardDeckRepo.js';
import * as topicRepo from '../repositories/topicRepo.js';
import { sendInvites } from '../services/inviteService.js';
import { streamSessionExport } from '../services/exportService.js';
import { purgeSession } from '../services/purgeService.js';
import { completeSession } from '../services/sessionLifecycleService.js';
import { createSession, DEFAULT_DECK_ID } from '../services/sessionCreationService.js';
import { getIo } from '../sockets/index.js';

export const pokerSessionRouter = Router();

const inviteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
// Custom join codes are guessable, so make probing them for existing sessions slow.
const joinLookupLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 });

async function loadOwnedSession(sessionId: string, facilitatorId: string) {
  const session = await pokerSessionRepo.findById(sessionId);
  if (!session) throw new HttpError(404, 'not_found', 'Session not found');
  if (session.facilitator_id !== facilitatorId) throw new HttpError(403, 'forbidden', 'Not your session');
  return session;
}

pokerSessionRouter.get('/', requireAuth, async (req, res) => {
  const sessions = await pokerSessionRepo.listForFacilitator(req.user!.id);
  res.json({ sessions });
});

pokerSessionRouter.get('/by-join-code/:joinCode', joinLookupLimiter, async (req, res) => {
  const session = await pokerSessionRepo.findByJoinCode(req.params.joinCode.toUpperCase());
  if (!session) {
    res.status(404).json({ error: { code: 'not_found', message: 'No session with that code' } });
    return;
  }
  res.json({
    session: {
      id: session.id,
      name: session.name,
      joinCode: session.join_code,
      status: session.status,
    },
  });
});

pokerSessionRouter.post('/', requireAuth, async (req, res) => {
  const { name, deckId, joinCode } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof deckId !== 'string') {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Name and deckId are required' } });
    return;
  }
  const deck = await cardDeckRepo.findDeckById(deckId);
  if (!deck) {
    res.status(400).json({ error: { code: 'invalid_deck', message: 'Unknown deck' } });
    return;
  }
  const session = await createSession({ facilitatorId: req.user!.id, name: name.trim(), deckId, joinCode });
  res.status(201).json({ session });
});

// A one-round, one-topic session that is ready to play immediately.
pokerSessionRouter.post('/quick-hand', requireAuth, async (req, res) => {
  const { name, deckId, joinCode } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Name is required' } });
    return;
  }
  const chosenDeckId = typeof deckId === 'string' && deckId ? deckId : DEFAULT_DECK_ID;
  const deck = await cardDeckRepo.findDeckById(chosenDeckId);
  if (!deck) {
    res.status(400).json({ error: { code: 'invalid_deck', message: 'Unknown deck' } });
    return;
  }
  const session = await createSession({
    facilitatorId: req.user!.id,
    name: name.trim().slice(0, 150),
    deckId: chosenDeckId,
    joinCode,
    isQuickHand: true,
  });
  res.status(201).json({ session });
});

pokerSessionRouter.get('/:id', requireAuth, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  const topics = await topicRepo.listBySession(session.id);
  res.json({ session, topics });
});

pokerSessionRouter.patch('/:id', requireAuth, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  const { name, deckId } = req.body ?? {};
  await pokerSessionRepo.updateSession(session.id, {
    name: typeof name === 'string' ? name.trim() : undefined,
    deckId: typeof deckId === 'string' ? deckId : undefined,
  });
  res.json({ ok: true });
});

pokerSessionRouter.post('/:id/invites', requireAuth, inviteLimiter, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  const { emails } = req.body ?? {};
  if (!Array.isArray(emails) || emails.length === 0) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'At least one email is required' } });
    return;
  }
  const results = await sendInvites(session.name, session.join_code, emails.map(String));
  res.json({ results });
});

pokerSessionRouter.post('/:id/complete', requireAuth, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  const updated = await completeSession(getIo(), session.id);
  res.json({ session: updated });
});

pokerSessionRouter.get('/:id/export', requireAuth, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  await streamSessionExport(session, res);
});

pokerSessionRouter.delete('/:id', requireAuth, async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.user!.id);
  await purgeSession(session.id);
  res.json({ ok: true });
});

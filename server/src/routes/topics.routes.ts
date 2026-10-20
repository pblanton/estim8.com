import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireParticipantOrFacilitator } from '../middleware/requireParticipantOrFacilitator.js';
import { HttpError } from '../middleware/errorHandler.js';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import * as topicRepo from '../repositories/topicRepo.js';
import * as voteRepo from '../repositories/voteRepo.js';
import * as participantRepo from '../repositories/participantRepo.js';
import * as resultsRepo from '../repositories/resultsRepo.js';
import { computeConsensus } from '../services/consensusService.js';
import { writeResultsMarkdown } from '../services/resultsMarkdownService.js';
import { getIo } from '../sockets/index.js';
import { sessionRoom } from '../sockets/broadcast.js';
import { ServerEvents } from '@estim8/shared';

export const topicRouter = Router();

async function loadOwnedSession(sessionId: string, facilitatorId: string) {
  const session = await pokerSessionRepo.findById(sessionId);
  if (!session) throw new HttpError(404, 'not_found', 'Session not found');
  if (session.facilitator_id !== facilitatorId) throw new HttpError(403, 'forbidden', 'Not your session');
  return session;
}

async function loadOwnedTopic(topicId: string, facilitatorId: string) {
  const topic = await topicRepo.findById(topicId);
  if (!topic) throw new HttpError(404, 'not_found', 'Topic not found');
  await loadOwnedSession(topic.poker_session_id, facilitatorId);
  return topic;
}

topicRouter.get('/poker-sessions/:sessionId/topics', requireAuth, async (req, res) => {
  await loadOwnedSession(req.params.sessionId, req.user!.id);
  const topics = await topicRepo.listBySession(req.params.sessionId);
  res.json({ topics });
});

topicRouter.post('/poker-sessions/:sessionId/topics', requireAuth, async (req, res) => {
  await loadOwnedSession(req.params.sessionId, req.user!.id);
  const { name, description } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Topic name is required' } });
    return;
  }
  const topic = await topicRepo.createTopic(req.params.sessionId, name.trim(), description ?? null);
  res.status(201).json({ topic });
});

topicRouter.get('/topics/:topicId', requireParticipantOrFacilitator, async (req, res) => {
  const topic = await topicRepo.findById(req.params.topicId);
  res.json({ topic });
});

topicRouter.patch('/topics/:topicId', requireAuth, async (req, res) => {
  const topic = await loadOwnedTopic(req.params.topicId, req.user!.id);
  const { name, description } = req.body ?? {};
  await topicRepo.updateTopic(topic.id, {
    name: typeof name === 'string' ? name.trim() : undefined,
    description: description === null ? null : typeof description === 'string' ? description : undefined,
  });
  res.json({ ok: true });
});

topicRouter.delete('/topics/:topicId', requireAuth, async (req, res) => {
  const topic = await loadOwnedTopic(req.params.topicId, req.user!.id);
  await topicRepo.deleteTopic(topic.id);
  res.json({ ok: true });
});

topicRouter.get('/topics/:topicId/results', requireAuth, async (req, res) => {
  const topic = await loadOwnedTopic(req.params.topicId, req.user!.id);
  const results = await resultsRepo.findByTopic(topic.id);
  res.json({ results });
});

topicRouter.put('/topics/:topicId/results', requireAuth, async (req, res) => {
  const topic = await loadOwnedTopic(req.params.topicId, req.user!.id);
  const session = await pokerSessionRepo.findById(topic.poker_session_id);
  const { consensusValue, notes } = req.body ?? {};
  if (consensusValue !== null && typeof consensusValue !== 'string') {
    res.status(400).json({ error: { code: 'invalid_input', message: 'consensusValue must be a string or null' } });
    return;
  }

  const votes = await voteRepo.listByTopic(topic.id);
  const participants = await participantRepo.listBySession(topic.poker_session_id);
  const voteSummaries = votes.map((v) => ({
    participantId: v.participant_id,
    displayName: participants.find((p) => p.id === v.participant_id)?.display_name ?? 'Unknown',
    value: v.value,
  }));
  const consensus = computeConsensus(voteSummaries);

  const result = await resultsRepo.upsertResult({
    topicId: topic.id,
    consensusValue: consensusValue ?? null,
    notes: typeof notes === 'string' ? notes : null,
    votesSnapshot: voteSummaries,
    agreementPct: consensus.agreementPct,
    savedBy: req.user!.id,
  });

  await writeResultsMarkdown({
    topicId: topic.id,
    topicName: topic.name,
    sessionName: session?.name ?? '',
    savedByDisplayName: req.user!.display_name,
    savedAt: result.saved_at,
    consensusValue: result.consensus_value,
    agreementPct: Number(result.agreement_pct ?? 0),
    notes: result.notes,
    votes: voteSummaries,
  });

  getIo().to(sessionRoom(topic.poker_session_id)).emit(ServerEvents.ResultsSaved, {
    topicId: topic.id,
    results: {
      consensusValue: result.consensus_value,
      notes: result.notes,
      votes: voteSummaries,
      agreementPct: result.agreement_pct,
      savedAt: result.saved_at,
    },
  });

  res.json({ result });
});

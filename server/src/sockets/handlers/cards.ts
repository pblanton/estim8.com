import type { AppServer, AppSocket } from '../types.js';
import {
  ServerEvents,
  type CardPickPayload,
  type CardsRevealedPayload,
  type RevealRequestAck,
  type TopicScopedPayload,
} from '@estim8/shared';
import * as pokerSessionRepo from '../../repositories/pokerSessionRepo.js';
import * as topicRepo from '../../repositories/topicRepo.js';
import * as participantRepo from '../../repositories/participantRepo.js';
import * as voteRepo from '../../repositories/voteRepo.js';
import * as cardDeckRepo from '../../repositories/cardDeckRepo.js';
import { computeConsensus } from '../../services/consensusService.js';
import { getConnectedParticipantIds } from '../presence.js';
import { broadcastParticipantsUpdate, sessionRoom } from '../broadcast.js';

export function registerCardHandlers(io: AppServer, socket: AppSocket) {
  socket.on('card:pick', async (payload: CardPickPayload) => {
    const participantId = socket.data.participantId;
    const pokerSessionId = socket.data.pokerSessionId;
    if (!participantId || !pokerSessionId) return;

    const topic = await topicRepo.findById(payload.topicId);
    if (!topic || topic.poker_session_id !== pokerSessionId || topic.status !== 'active') return;

    const session = await pokerSessionRepo.findById(pokerSessionId);
    if (!session) return;
    const deck = await cardDeckRepo.findDeckById(session.deck_id);
    if (!deck || !deck.labels.includes(payload.value)) return;

    await voteRepo.upsertVote(topic.id, participantId, payload.value);
    io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.CardPicked, { topicId: topic.id, participantId });
    await broadcastParticipantsUpdate(io, pokerSessionId, topic.id);
  });

  socket.on('card:clear', async (payload: TopicScopedPayload) => {
    const participantId = socket.data.participantId;
    const pokerSessionId = socket.data.pokerSessionId;
    if (!participantId || !pokerSessionId) return;

    await voteRepo.clearVote(payload.topicId, participantId);
    io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.CardCleared, { topicId: payload.topicId, participantId });
    await broadcastParticipantsUpdate(io, pokerSessionId, payload.topicId);
  });

  socket.on('reveal:request', async (payload: TopicScopedPayload, ack: (res: RevealRequestAck) => void) => {
    const pokerSessionId = socket.data.pokerSessionId;
    if (!socket.data.isFacilitatorOwner || !pokerSessionId) {
      ack({ ok: false });
      return;
    }

    const topic = await topicRepo.findById(payload.topicId);
    if (!topic || topic.poker_session_id !== pokerSessionId) {
      ack({ ok: false });
      return;
    }

    const connectedIds = getConnectedParticipantIds(pokerSessionId);
    const participants = await participantRepo.listBySession(pokerSessionId);
    const connectedParticipants = participants.filter((p) => connectedIds.has(p.id));

    const votes = await voteRepo.listByTopic(topic.id);
    const votedIds = new Set(votes.map((v) => v.participant_id));

    const missing = connectedParticipants.filter((p) => !votedIds.has(p.id)).map((p) => p.display_name);
    if (missing.length > 0) {
      ack({ ok: false, reason: 'not_all_picked', missing });
      return;
    }

    await topicRepo.setStatus(topic.id, 'revealed');

    const voteSummaries = votes
      .filter((v) => connectedParticipants.some((p) => p.id === v.participant_id))
      .map((v) => ({
        participantId: v.participant_id,
        displayName: connectedParticipants.find((p) => p.id === v.participant_id)?.display_name ?? 'Unknown',
        value: v.value,
      }));

    const consensus = computeConsensus(voteSummaries);
    const revealedPayload: CardsRevealedPayload = { topicId: topic.id, votes: voteSummaries, consensus };

    ack({ ok: true });
    io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.CardsRevealed, revealedPayload);
  });
}

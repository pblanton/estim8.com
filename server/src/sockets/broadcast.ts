import { ServerEvents } from '@estim8/shared';
import * as participantRepo from '../repositories/participantRepo.js';
import * as voteRepo from '../repositories/voteRepo.js';
import { getConnectedParticipantIds } from './presence.js';
import type { AppServer } from './types.js';

export function sessionRoom(pokerSessionId: string): string {
  return `session:${pokerSessionId}`;
}

export async function broadcastParticipantsUpdate(io: AppServer, pokerSessionId: string, activeTopicId: string | null): Promise<void> {
  const participants = await participantRepo.listBySession(pokerSessionId);
  const connected = getConnectedParticipantIds(pokerSessionId);
  const votes = activeTopicId ? await voteRepo.listByTopic(activeTopicId) : [];
  const votedIds = new Set(votes.map((v) => v.participant_id));

  const summary = participants.map((p) => ({
    id: p.id,
    displayName: p.display_name,
    role: p.role,
    hasPicked: votedIds.has(p.id),
    connected: connected.has(p.id),
  }));

  io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.ParticipantsUpdate, { participants: summary });
}

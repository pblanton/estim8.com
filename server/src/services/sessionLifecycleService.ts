import { ServerEvents } from '@estim8/shared';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import type { PokerSessionRow } from '../repositories/pokerSessionRepo.js';
import { sessionRoom } from '../sockets/broadcast.js';
import type { AppServer } from '../sockets/types.js';

export async function completeSession(io: AppServer, sessionId: string): Promise<PokerSessionRow> {
  const updated = await pokerSessionRepo.markCompleted(sessionId);
  io.to(sessionRoom(sessionId)).emit(ServerEvents.SessionCompleted, {
    purgeAt: updated.purge_at?.toISOString(),
  });
  return updated;
}

export async function reopenSession(io: AppServer, sessionId: string): Promise<PokerSessionRow> {
  const updated = await pokerSessionRepo.markReopened(sessionId);
  io.to(sessionRoom(sessionId)).emit(ServerEvents.SessionReopened, {});
  return updated;
}

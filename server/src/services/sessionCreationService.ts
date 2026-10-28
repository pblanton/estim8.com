import { normalizeJoinCode, validateJoinCode } from '@estim8/shared';
import { HttpError } from '../middleware/errorHandler.js';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import type { PokerSessionRow } from '../repositories/pokerSessionRepo.js';
import * as topicRepo from '../repositories/topicRepo.js';

/** Fibonacci system deck (seeded by migration 0002). */
export const DEFAULT_DECK_ID = '00000000-0000-0000-0000-000000000001';

const JOIN_CODE_TAKEN = new HttpError(409, 'join_code_taken', 'That join code is already in use. Try another.');

async function resolveJoinCode(facilitatorId: string, requested: unknown): Promise<string> {
  if (typeof requested !== 'string' || !requested.trim()) {
    return pokerSessionRepo.generateUniqueJoinCode();
  }

  const problem = validateJoinCode(requested);
  if (problem) throw new HttpError(400, 'invalid_join_code', problem);

  const code = normalizeJoinCode(requested);
  const existing = await pokerSessionRepo.findByJoinCode(code);
  if (existing) {
    // A facilitator may reuse a code from one of their own finished sessions: nobody can join a
    // completed session anyway, so just move it to a random code to free the name.
    if (existing.facilitator_id === facilitatorId && existing.status === 'completed') {
      await pokerSessionRepo.renameJoinCode(existing.id, await pokerSessionRepo.generateUniqueJoinCode());
    } else {
      throw JOIN_CODE_TAKEN;
    }
  }
  return code;
}

export async function createSession(opts: {
  facilitatorId: string;
  name: string;
  deckId: string;
  joinCode?: unknown;
  isQuickHand?: boolean;
}): Promise<PokerSessionRow> {
  const joinCode = await resolveJoinCode(opts.facilitatorId, opts.joinCode);

  let session: PokerSessionRow;
  try {
    session = await pokerSessionRepo.createSession(opts.facilitatorId, opts.name, opts.deckId, joinCode, opts.isQuickHand);
  } catch (err) {
    // Lost a race for the same code between the lookup above and the insert.
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw JOIN_CODE_TAKEN;
    throw err;
  }

  if (opts.isQuickHand) {
    // One topic named after the session, already on the table.
    const topic = await topicRepo.createTopic(session.id, opts.name, null);
    await topicRepo.setStatus(topic.id, 'active');
    await pokerSessionRepo.setActiveTopic(session.id, topic.id);
    session = (await pokerSessionRepo.findById(session.id))!;
  }
  return session;
}

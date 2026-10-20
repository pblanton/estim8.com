import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export type ParticipantRole = 'player' | 'facilitator';

export interface ParticipantRow {
  id: string;
  poker_session_id: string;
  display_name: string;
  participant_token_hash: string;
  role: ParticipantRole;
  last_seen_at: Date;
  created_at: Date;
}

export async function countPlayers(pokerSessionId: string): Promise<number> {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM participants WHERE poker_session_id = ? AND role = 'player'",
    [pokerSessionId],
  );
  return (rows as { count: number }[])[0].count;
}

export async function findByTokenHash(tokenHash: string): Promise<ParticipantRow | null> {
  const [rows] = await pool.query('SELECT * FROM participants WHERE participant_token_hash = ? LIMIT 1', [tokenHash]);
  const list = rows as ParticipantRow[];
  return list[0] ?? null;
}

export async function findById(id: string): Promise<ParticipantRow | null> {
  const [rows] = await pool.query('SELECT * FROM participants WHERE id = ? LIMIT 1', [id]);
  const list = rows as ParticipantRow[];
  return list[0] ?? null;
}

export async function listBySession(pokerSessionId: string): Promise<ParticipantRow[]> {
  const [rows] = await pool.query('SELECT * FROM participants WHERE poker_session_id = ? ORDER BY created_at ASC', [
    pokerSessionId,
  ]);
  return rows as ParticipantRow[];
}

export async function createParticipant(
  pokerSessionId: string,
  displayName: string,
  tokenHash: string,
  role: ParticipantRole,
): Promise<ParticipantRow> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO participants (id, poker_session_id, display_name, participant_token_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, pokerSessionId, displayName, tokenHash, role],
  );
  return (await findById(id))!;
}

export async function touchLastSeen(id: string): Promise<void> {
  await pool.query('UPDATE participants SET last_seen_at = NOW() WHERE id = ?', [id]);
}

import { randomUUID } from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { pool } from '../db/pool.js';
import { SESSION_PURGE_DAYS_AFTER_COMPLETION } from '@estim8/shared';

const generateJoinCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export type PokerSessionStatus = 'draft' | 'active' | 'completed';

export interface PokerSessionRow {
  id: string;
  facilitator_id: string;
  name: string;
  join_code: string;
  deck_id: string;
  status: PokerSessionStatus;
  active_topic_id: string | null;
  completed_at: Date | null;
  purge_at: Date | null;
  last_activity_at: Date;
  created_at: Date;
  updated_at: Date;
}

export async function createSession(facilitatorId: string, name: string, deckId: string): Promise<PokerSessionRow> {
  const id = randomUUID();
  let joinCode = generateJoinCode();
  // Extremely unlikely collision, but guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findByJoinCode(joinCode);
    if (!existing) break;
    joinCode = generateJoinCode();
  }
  await pool.query(
    "INSERT INTO poker_sessions (id, facilitator_id, name, join_code, deck_id, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [id, facilitatorId, name, joinCode, deckId],
  );
  return (await findById(id))!;
}

export async function findById(id: string): Promise<PokerSessionRow | null> {
  const [rows] = await pool.query('SELECT * FROM poker_sessions WHERE id = ? LIMIT 1', [id]);
  const list = rows as PokerSessionRow[];
  return list[0] ?? null;
}

export async function findByJoinCode(joinCode: string): Promise<PokerSessionRow | null> {
  const [rows] = await pool.query('SELECT * FROM poker_sessions WHERE join_code = ? LIMIT 1', [joinCode]);
  const list = rows as PokerSessionRow[];
  return list[0] ?? null;
}

export async function listForFacilitator(facilitatorId: string): Promise<PokerSessionRow[]> {
  const [rows] = await pool.query(
    'SELECT * FROM poker_sessions WHERE facilitator_id = ? ORDER BY created_at DESC',
    [facilitatorId],
  );
  return rows as PokerSessionRow[];
}

export async function updateSession(id: string, fields: { name?: string; deckId?: string }): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) {
    sets.push('name = ?');
    values.push(fields.name);
  }
  if (fields.deckId !== undefined) {
    sets.push('deck_id = ?');
    values.push(fields.deckId);
  }
  if (sets.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE poker_sessions SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function setActiveTopic(id: string, topicId: string | null): Promise<void> {
  await pool.query('UPDATE poker_sessions SET active_topic_id = ?, last_activity_at = NOW() WHERE id = ?', [topicId, id]);
}

export async function touchActivity(id: string): Promise<void> {
  await pool.query('UPDATE poker_sessions SET last_activity_at = NOW() WHERE id = ?', [id]);
}

export async function markCompleted(id: string): Promise<PokerSessionRow> {
  await pool.query(
    `UPDATE poker_sessions
     SET status = 'completed', completed_at = NOW(), purge_at = DATE_ADD(NOW(), INTERVAL ? DAY)
     WHERE id = ?`,
    [SESSION_PURGE_DAYS_AFTER_COMPLETION, id],
  );
  return (await findById(id))!;
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query('DELETE FROM poker_sessions WHERE id = ?', [id]);
}

export async function findSessionsToPurge(): Promise<PokerSessionRow[]> {
  const [rows] = await pool.query(
    `SELECT * FROM poker_sessions
     WHERE (purge_at IS NOT NULL AND purge_at <= NOW())
        OR (status != 'completed' AND last_activity_at < DATE_SUB(NOW(), INTERVAL 30 DAY))`,
  );
  return rows as PokerSessionRow[];
}

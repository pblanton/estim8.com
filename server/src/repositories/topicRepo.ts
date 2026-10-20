import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export type TopicStatus = 'pending' | 'active' | 'revealed' | 'completed';

export interface TopicRow {
  id: string;
  poker_session_id: string;
  name: string;
  description: string | null;
  position: number;
  status: TopicStatus;
  created_at: Date;
  updated_at: Date;
}

export async function listBySession(pokerSessionId: string): Promise<TopicRow[]> {
  const [rows] = await pool.query(
    'SELECT * FROM topics WHERE poker_session_id = ? ORDER BY position ASC',
    [pokerSessionId],
  );
  return rows as TopicRow[];
}

export async function findById(id: string): Promise<TopicRow | null> {
  const [rows] = await pool.query('SELECT * FROM topics WHERE id = ? LIMIT 1', [id]);
  const list = rows as TopicRow[];
  return list[0] ?? null;
}

export async function createTopic(pokerSessionId: string, name: string, description: string | null): Promise<TopicRow> {
  const id = randomUUID();
  const [[{ nextPosition }]] = (await pool.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM topics WHERE poker_session_id = ?',
    [pokerSessionId],
  )) as [{ nextPosition: number }[], unknown];
  await pool.query(
    'INSERT INTO topics (id, poker_session_id, name, description, position) VALUES (?, ?, ?, ?, ?)',
    [id, pokerSessionId, name, description, nextPosition],
  );
  return (await findById(id))!;
}

export async function updateTopic(id: string, fields: { name?: string; description?: string | null }): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) {
    sets.push('name = ?');
    values.push(fields.name);
  }
  if (fields.description !== undefined) {
    sets.push('description = ?');
    values.push(fields.description);
  }
  if (sets.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function setStatus(id: string, status: TopicStatus): Promise<void> {
  await pool.query('UPDATE topics SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteTopic(id: string): Promise<void> {
  await pool.query('DELETE FROM topics WHERE id = ?', [id]);
}

export async function findNextPending(pokerSessionId: string, afterPosition: number): Promise<TopicRow | null> {
  const [rows] = await pool.query(
    "SELECT * FROM topics WHERE poker_session_id = ? AND position > ? AND status = 'pending' ORDER BY position ASC LIMIT 1",
    [pokerSessionId, afterPosition],
  );
  const list = rows as TopicRow[];
  return list[0] ?? null;
}

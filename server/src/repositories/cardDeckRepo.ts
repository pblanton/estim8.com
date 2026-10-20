import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import type { DeckType } from '@estim8/shared';

export interface CardDeckRow {
  id: string;
  owner_id: string | null;
  name: string;
  type: DeckType;
  labels: string[];
  is_system: boolean;
}

function parseRow(row: any): CardDeckRow {
  return { ...row, labels: typeof row.labels === 'string' ? JSON.parse(row.labels) : row.labels };
}

export async function listDecksForUser(userId: string): Promise<CardDeckRow[]> {
  const [rows] = await pool.query(
    'SELECT * FROM card_decks WHERE is_system = TRUE OR owner_id = ? ORDER BY is_system DESC, created_at ASC',
    [userId],
  );
  return (rows as any[]).map(parseRow);
}

export async function findDeckById(id: string): Promise<CardDeckRow | null> {
  const [rows] = await pool.query('SELECT * FROM card_decks WHERE id = ? LIMIT 1', [id]);
  const list = rows as any[];
  return list[0] ? parseRow(list[0]) : null;
}

export async function createCustomDeck(ownerId: string, name: string, labels: string[]): Promise<CardDeckRow> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO card_decks (id, owner_id, name, type, labels, is_system) VALUES (?, ?, ?, ?, ?, FALSE)',
    [id, ownerId, name, 'custom', JSON.stringify(labels)],
  );
  return (await findDeckById(id))!;
}

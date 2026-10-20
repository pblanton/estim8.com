import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export interface AuthSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
}

const TTL_DAYS = 30;

export async function createAuthSession(
  userId: string,
  tokenHash: string,
  userAgent: string | undefined,
  ipAddress: string | undefined,
): Promise<void> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO auth_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [id, userId, tokenHash, userAgent ?? null, ipAddress ?? null, TTL_DAYS],
  );
}

export async function findValidSessionByTokenHash(tokenHash: string): Promise<AuthSessionRow | null> {
  const [rows] = await pool.query(
    'SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
    [tokenHash],
  );
  const list = rows as AuthSessionRow[];
  return list[0] ?? null;
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
}

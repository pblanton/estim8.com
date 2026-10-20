import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export interface EmailVerificationRow {
  id: string;
  user_id: string;
  token_hash: string;
  code: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

const TTL_HOURS = 24;

export async function createEmailVerification(userId: string, tokenHash: string, code: string) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO email_verifications (id, user_id, token_hash, code, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
    [id, userId, tokenHash, code, TTL_HOURS],
  );
  return id;
}

export async function findValidByTokenHash(tokenHash: string): Promise<EmailVerificationRow | null> {
  const [rows] = await pool.query(
    'SELECT * FROM email_verifications WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > NOW() LIMIT 1',
    [tokenHash],
  );
  const list = rows as EmailVerificationRow[];
  return list[0] ?? null;
}

export async function findValidByEmailAndCode(userId: string, code: string): Promise<EmailVerificationRow | null> {
  const [rows] = await pool.query(
    'SELECT * FROM email_verifications WHERE user_id = ? AND code = ? AND consumed_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [userId, code],
  );
  const list = rows as EmailVerificationRow[];
  return list[0] ?? null;
}

export async function consume(id: string): Promise<void> {
  await pool.query('UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?', [id]);
}

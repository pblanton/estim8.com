import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export type UserStatus = 'pending_verification' | 'pending_password' | 'active' | 'disabled';

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const list = rows as UserRow[];
  return list[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  const list = rows as UserRow[];
  return list[0] ?? null;
}

export async function createUser(email: string, displayName: string): Promise<UserRow> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO users (id, email, display_name, status) VALUES (?, ?, ?, ?)',
    [id, email, displayName, 'pending_verification'],
  );
  return (await findUserById(id))!;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await pool.query(
    "UPDATE users SET email_verified_at = NOW(), status = 'pending_password' WHERE id = ? AND email_verified_at IS NULL",
    [userId],
  );
}

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query(
    "UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?",
    [passwordHash, userId],
  );
}

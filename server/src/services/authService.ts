import bcrypt from 'bcrypt';
import type { Response } from 'express';
import { env } from '../config/env.js';
import * as authSessionRepo from '../repositories/authSessionRepo.js';
import * as emailVerificationRepo from '../repositories/emailVerificationRepo.js';
import * as userRepo from '../repositories/userRepo.js';
import { sendVerificationEmail } from './emailService.js';
import { generateRawToken, generateSixDigitCode, sha256Hex, signTicket, verifyTicket } from '../utils/tokens.js';

export const AUTH_COOKIE_NAME = 'estim8_sid';
const SET_PASSWORD_TICKET_TTL_SECONDS = 15 * 60;

export async function registerFacilitator(email: string, displayName: string) {
  const existing = await userRepo.findUserByEmail(email);
  if (existing && existing.status !== 'pending_verification') {
    throw new Error('email_in_use');
  }

  const user = existing ?? (await userRepo.createUser(email, displayName));
  await issueVerification(user.id, email);
  return user;
}

export async function resendVerification(email: string) {
  const user = await userRepo.findUserByEmail(email);
  if (user && user.status === 'pending_verification') {
    await issueVerification(user.id, email);
  }
  // Always resolves without revealing whether the email exists.
}

async function issueVerification(userId: string, email: string) {
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const code = generateSixDigitCode();
  await emailVerificationRepo.createEmailVerification(userId, tokenHash, code);
  await sendVerificationEmail(email, rawToken, code);
}

export async function verifyByToken(rawToken: string): Promise<string> {
  const tokenHash = sha256Hex(rawToken);
  const row = await emailVerificationRepo.findValidByTokenHash(tokenHash);
  if (!row) throw new Error('invalid_or_expired');
  await emailVerificationRepo.consume(row.id);
  await userRepo.markEmailVerified(row.user_id);
  return issueSetPasswordTicket(row.user_id);
}

export async function verifyByCode(email: string, code: string): Promise<string> {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new Error('invalid_or_expired');
  const row = await emailVerificationRepo.findValidByEmailAndCode(user.id, code);
  if (!row) throw new Error('invalid_or_expired');
  await emailVerificationRepo.consume(row.id);
  await userRepo.markEmailVerified(user.id);
  return issueSetPasswordTicket(user.id);
}

function issueSetPasswordTicket(userId: string): string {
  return signTicket({ userId, purpose: 'set-password' }, env.verificationTicketSecret, SET_PASSWORD_TICKET_TTL_SECONDS);
}

export async function setPassword(verificationTicket: string, password: string, res: Response) {
  const verified = verifyTicket(verificationTicket, env.verificationTicketSecret, 'set-password');
  if (!verified) throw new Error('invalid_or_expired_ticket');

  const user = await userRepo.findUserById(verified.userId);
  if (!user || user.status !== 'pending_password') throw new Error('invalid_state');

  const passwordHash = await bcrypt.hash(password, 12);
  await userRepo.setPassword(user.id, passwordHash);
  await establishSession(user.id, res);
  return user;
}

export async function login(email: string, password: string, res: Response) {
  const user = await userRepo.findUserByEmail(email);
  if (!user || user.status !== 'active' || !user.password_hash) throw new Error('invalid_credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('invalid_credentials');

  await establishSession(user.id, res);
  return user;
}

async function establishSession(userId: string, res: Response, userAgent?: string, ipAddress?: string) {
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  await authSessionRepo.createAuthSession(userId, tokenHash, userAgent, ipAddress);
  res.cookie(AUTH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export async function logout(rawToken: string | undefined, res: Response) {
  if (rawToken) {
    await authSessionRepo.deleteSessionByTokenHash(sha256Hex(rawToken));
  }
  res.clearCookie(AUTH_COOKIE_NAME);
}

export async function resolveUserFromCookie(rawToken: string | undefined) {
  if (!rawToken) return null;
  const session = await authSessionRepo.findValidSessionByTokenHash(sha256Hex(rawToken));
  if (!session) return null;
  return userRepo.findUserById(session.user_id);
}

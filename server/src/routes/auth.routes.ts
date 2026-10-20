import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authService from '../services/authService.js';
import { AUTH_COOKIE_NAME } from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post('/register', registerLimiter, async (req, res) => {
  const { email, displayName } = req.body ?? {};
  if (!isValidEmail(email) || typeof displayName !== 'string' || !displayName.trim()) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Valid email and display name are required' } });
    return;
  }

  try {
    await authService.registerFacilitator(email.toLowerCase().trim(), displayName.trim());
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'email_in_use') {
      res.status(409).json({ error: { code: 'email_in_use', message: 'That email is already registered' } });
      return;
    }
    throw err;
  }
});

authRouter.post('/resend-verification', verifyLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Valid email is required' } });
    return;
  }
  await authService.resendVerification(email.toLowerCase().trim());
  res.json({ ok: true });
});

authRouter.post('/verify-token', verifyLimiter, async (req, res) => {
  const { token } = req.body ?? {};
  if (typeof token !== 'string' || !token) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Token is required' } });
    return;
  }
  try {
    const verificationTicket = await authService.verifyByToken(token);
    res.json({ ok: true, verificationTicket });
  } catch {
    res.status(400).json({ error: { code: 'invalid_or_expired', message: 'This verification link is invalid or has expired' } });
  }
});

authRouter.post('/verify-code', verifyLimiter, async (req, res) => {
  const { email, code } = req.body ?? {};
  if (!isValidEmail(email) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Valid email and 6-digit code are required' } });
    return;
  }
  try {
    const verificationTicket = await authService.verifyByCode(email.toLowerCase().trim(), code);
    res.json({ ok: true, verificationTicket });
  } catch {
    res.status(400).json({ error: { code: 'invalid_or_expired', message: 'That code is invalid or has expired' } });
  }
});

authRouter.post('/set-password', async (req, res) => {
  const { verificationTicket, password } = req.body ?? {};
  if (typeof verificationTicket !== 'string' || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Password must be at least 8 characters' } });
    return;
  }
  try {
    const user = await authService.setPassword(verificationTicket, password, res);
    res.json({ ok: true, user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch {
    res.status(400).json({ error: { code: 'invalid_or_expired_ticket', message: 'This verification session is invalid or has expired' } });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!isValidEmail(email) || typeof password !== 'string') {
    res.status(400).json({ error: { code: 'invalid_input', message: 'Email and password are required' } });
    return;
  }
  try {
    const user = await authService.login(email.toLowerCase().trim(), password, res);
    res.json({ ok: true, user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch {
    res.status(401).json({ error: { code: 'invalid_credentials', message: 'Incorrect email or password' } });
  }
});

authRouter.post('/logout', async (req, res) => {
  await authService.logout(req.cookies?.[AUTH_COOKIE_NAME], res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = req.user!;
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
});

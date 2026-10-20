import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE_NAME, resolveUserFromCookie } from '../services/authService.js';
import type { UserRow } from '../repositories/userRepo.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const user = await resolveUserFromCookie(token);
  if (!user) {
    res.status(401).json({ error: { code: 'unauthenticated', message: 'Login required' } });
    return;
  }
  req.user = user;
  next();
}

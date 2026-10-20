import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

interface TicketPayload {
  userId: string;
  purpose: string;
  exp: number;
}

export function signTicket(payload: Omit<TicketPayload, 'exp'>, secret: string, ttlSeconds: number): string {
  const full: TicketPayload = { ...payload, exp: Date.now() + ttlSeconds * 1000 };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyTicket(ticket: string, secret: string, expectedPurpose: string): { userId: string } | null {
  const [body, signature] = ticket.split('.');
  if (!body || !signature) return null;
  const expectedSignature = createHmac('sha256', secret).update(body).digest('base64url');
  if (signature !== expectedSignature) return null;

  let payload: TicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.purpose !== expectedPurpose) return null;
  if (payload.exp < Date.now()) return null;
  return { userId: payload.userId };
}

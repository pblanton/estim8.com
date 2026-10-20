import { sendInviteEmail } from './emailService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITES_PER_REQUEST = 20;

export interface InviteResult {
  email: string;
  sent: boolean;
}

export async function sendInvites(sessionName: string, joinCode: string, emails: string[]): Promise<InviteResult[]> {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()))].slice(0, MAX_INVITES_PER_REQUEST);
  const results: InviteResult[] = [];

  for (const email of unique) {
    if (!EMAIL_RE.test(email)) {
      results.push({ email, sent: false });
      continue;
    }
    try {
      await sendInviteEmail(email, sessionName, joinCode);
      results.push({ email, sent: true });
    } catch (err) {
      console.error(`Failed to send invite to ${email}:`, err);
      results.push({ email, sent: false });
    }
  }

  // Addresses are deliberately not persisted anywhere — sent-and-discarded.
  return results;
}

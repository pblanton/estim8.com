import { rm } from 'node:fs/promises';
import cron from 'node-cron';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import * as topicRepo from '../repositories/topicRepo.js';
import { topicUploadDir } from './uploadService.js';

export async function purgeSession(sessionId: string): Promise<void> {
  const topics = await topicRepo.listBySession(sessionId);
  for (const topic of topics) {
    await rm(topicUploadDir(topic.id), { recursive: true, force: true });
  }
  await pokerSessionRepo.deleteSession(sessionId);
}

export async function runPurgeSweep(): Promise<number> {
  const sessions = await pokerSessionRepo.findSessionsToPurge();
  for (const session of sessions) {
    console.log(`Purging session ${session.id} (${session.name})`);
    await purgeSession(session.id);
  }
  return sessions.length;
}

export function startPurgeScheduler(): void {
  // Daily sweep: 7-days-post-completion sessions and 30-day abandoned drafts.
  cron.schedule('0 3 * * *', () => {
    runPurgeSweep().catch((err) => console.error('Purge sweep failed:', err));
  });
}

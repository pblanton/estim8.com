import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export interface TopicVoteRow {
  id: string;
  topic_id: string;
  participant_id: string;
  value: string;
  updated_at: Date;
}

export async function upsertVote(topicId: string, participantId: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO topic_votes (id, topic_id, participant_id, value)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
    [randomUUID(), topicId, participantId, value],
  );
}

export async function clearVote(topicId: string, participantId: string): Promise<void> {
  await pool.query('DELETE FROM topic_votes WHERE topic_id = ? AND participant_id = ?', [topicId, participantId]);
}

export async function listByTopic(topicId: string): Promise<TopicVoteRow[]> {
  const [rows] = await pool.query('SELECT * FROM topic_votes WHERE topic_id = ?', [topicId]);
  return rows as TopicVoteRow[];
}

export async function clearAllForTopic(topicId: string): Promise<void> {
  await pool.query('DELETE FROM topic_votes WHERE topic_id = ?', [topicId]);
}

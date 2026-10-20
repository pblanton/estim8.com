import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import type { VoteSummary } from '@estim8/shared';

export interface TopicResultRow {
  id: string;
  topic_id: string;
  consensus_value: string | null;
  notes: string | null;
  votes_snapshot: VoteSummary[];
  agreement_pct: number | null;
  saved_by: string;
  saved_at: Date;
}

function parseRow(row: any): TopicResultRow {
  return {
    ...row,
    votes_snapshot: typeof row.votes_snapshot === 'string' ? JSON.parse(row.votes_snapshot) : row.votes_snapshot,
  };
}

export async function findByTopic(topicId: string): Promise<TopicResultRow | null> {
  const [rows] = await pool.query('SELECT * FROM topic_results WHERE topic_id = ? LIMIT 1', [topicId]);
  const list = rows as any[];
  return list[0] ? parseRow(list[0]) : null;
}

export async function upsertResult(input: {
  topicId: string;
  consensusValue: string | null;
  notes: string | null;
  votesSnapshot: VoteSummary[];
  agreementPct: number;
  savedBy: string;
}): Promise<TopicResultRow> {
  await pool.query(
    `INSERT INTO topic_results (id, topic_id, consensus_value, notes, votes_snapshot, agreement_pct, saved_by, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       consensus_value = VALUES(consensus_value),
       notes = VALUES(notes),
       votes_snapshot = VALUES(votes_snapshot),
       agreement_pct = VALUES(agreement_pct),
       saved_by = VALUES(saved_by),
       saved_at = NOW()`,
    [
      randomUUID(),
      input.topicId,
      input.consensusValue,
      input.notes,
      JSON.stringify(input.votesSnapshot),
      input.agreementPct,
      input.savedBy,
    ],
  );
  return (await findByTopic(input.topicId))!;
}

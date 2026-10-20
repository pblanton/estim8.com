import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

export type TopicFileKind = 'image' | 'pdf' | 'text' | 'markdown' | 'other';

export interface TopicFileRow {
  id: string;
  topic_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  position: number;
  kind: TopicFileKind;
  is_generated: boolean;
  uploaded_by: string | null;
  created_at: Date;
}

export async function listByTopic(topicId: string): Promise<TopicFileRow[]> {
  const [rows] = await pool.query(
    'SELECT * FROM topic_files WHERE topic_id = ? ORDER BY position ASC',
    [topicId],
  );
  return rows as TopicFileRow[];
}

export async function findById(id: string): Promise<TopicFileRow | null> {
  const [rows] = await pool.query('SELECT * FROM topic_files WHERE id = ? LIMIT 1', [id]);
  const list = rows as TopicFileRow[];
  return list[0] ?? null;
}

export async function createFile(input: {
  topicId: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  kind: TopicFileKind;
  uploadedBy: string | null;
}): Promise<TopicFileRow> {
  const id = randomUUID();
  const [[{ nextPosition }]] = (await pool.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM topic_files WHERE topic_id = ?',
    [input.topicId],
  )) as [{ nextPosition: number }[], unknown];

  await pool.query(
    `INSERT INTO topic_files
      (id, topic_id, original_filename, stored_filename, mime_type, size_bytes, position, kind, is_generated, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
    [
      id,
      input.topicId,
      input.originalFilename,
      input.storedFilename,
      input.mimeType,
      input.sizeBytes,
      nextPosition,
      input.kind,
      input.uploadedBy,
    ],
  );
  return (await findById(id))!;
}

export async function upsertGeneratedMarkdown(topicId: string, storedFilename: string, sizeBytes: number): Promise<void> {
  const [rows] = await pool.query(
    'SELECT id FROM topic_files WHERE topic_id = ? AND is_generated = TRUE LIMIT 1',
    [topicId],
  );
  const existing = (rows as { id: string }[])[0];
  if (existing) {
    await pool.query('UPDATE topic_files SET size_bytes = ?, created_at = NOW() WHERE id = ?', [sizeBytes, existing.id]);
    return;
  }
  await createFile({
    topicId,
    originalFilename: 'Results.md',
    storedFilename,
    mimeType: 'text/markdown',
    sizeBytes,
    kind: 'markdown',
    uploadedBy: null,
  });
  await pool.query('UPDATE topic_files SET is_generated = TRUE WHERE topic_id = ? AND stored_filename = ?', [
    topicId,
    storedFilename,
  ]);
}

export async function deleteFile(id: string): Promise<void> {
  await pool.query('DELETE FROM topic_files WHERE id = ?', [id]);
}

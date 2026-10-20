import { join } from 'node:path';
import { env } from '../config/env.js';
import type { TopicFileKind } from '../repositories/topicFileRepo.js';

export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
]);

export function kindForMimeType(mimeType: string): TopicFileKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/markdown') return 'markdown';
  if (mimeType === 'text/plain') return 'text';
  return 'other';
}

export function topicUploadDir(topicId: string): string {
  return join(env.uploadRoot, topicId);
}

export function topicFilePath(topicId: string, storedFilename: string): string {
  return join(topicUploadDir(topicId), storedFilename);
}

export function sanitizeFilename(original: string): string {
  return original.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150);
}

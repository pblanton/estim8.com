import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import multer from 'multer';
import { env } from '../config/env.js';
import { ALLOWED_MIME_TYPES, sanitizeFilename, topicUploadDir } from '../services/uploadService.js';
import { HttpError } from './errorHandler.js';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const topicId = req.params.topicId;
    const dir = topicUploadDir(topicId);
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}-${sanitizeFilename(file.originalname)}`);
  },
});

export const uploadTopicFiles = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(400, 'unsupported_file_type', `Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
}).array('files', 20);

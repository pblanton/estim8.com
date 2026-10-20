import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireParticipantOrFacilitator } from '../middleware/requireParticipantOrFacilitator.js';
import { uploadTopicFiles } from '../middleware/upload.js';
import { HttpError } from '../middleware/errorHandler.js';
import * as topicRepo from '../repositories/topicRepo.js';
import * as pokerSessionRepo from '../repositories/pokerSessionRepo.js';
import * as topicFileRepo from '../repositories/topicFileRepo.js';
import { kindForMimeType, topicFilePath } from '../services/uploadService.js';

export const topicFileRouter = Router();

async function assertFacilitatorOwnsTopic(topicId: string, facilitatorId: string) {
  const topic = await topicRepo.findById(topicId);
  if (!topic) throw new HttpError(404, 'not_found', 'Topic not found');
  const session = await pokerSessionRepo.findById(topic.poker_session_id);
  if (!session || session.facilitator_id !== facilitatorId) throw new HttpError(403, 'forbidden', 'Not your session');
  return topic;
}

topicFileRouter.post('/topics/:topicId/files', requireAuth, async (req, res, next) => {
  try {
    await assertFacilitatorOwnsTopic(req.params.topicId, req.user!.id);
  } catch (err) {
    next(err);
    return;
  }

  uploadTopicFiles(req, res, async (err) => {
    if (err) {
      next(err);
      return;
    }
    const files = (req.files as Express.Multer.File[]) ?? [];
    const created = [];
    for (const file of files) {
      const row = await topicFileRepo.createFile({
        topicId: req.params.topicId,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        kind: kindForMimeType(file.mimetype),
        uploadedBy: req.user!.id,
      });
      created.push(row);
    }
    res.status(201).json({ files: created });
  });
});

topicFileRouter.get('/topics/:topicId/files', requireParticipantOrFacilitator, async (req, res) => {
  const files = await topicFileRepo.listByTopic(req.params.topicId);
  res.json({ files });
});

topicFileRouter.get('/topics/:topicId/files/:fileId/raw', requireParticipantOrFacilitator, async (req, res) => {
  const file = await topicFileRepo.findById(req.params.fileId);
  if (!file || file.topic_id !== req.params.topicId) {
    res.status(404).json({ error: { code: 'not_found', message: 'File not found' } });
    return;
  }
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_filename)}"`);
  createReadStream(topicFilePath(file.topic_id, file.stored_filename)).pipe(res);
});

topicFileRouter.delete('/topic-files/:fileId', requireAuth, async (req, res) => {
  const file = await topicFileRepo.findById(req.params.fileId);
  if (!file) {
    res.status(404).json({ error: { code: 'not_found', message: 'File not found' } });
    return;
  }
  await assertFacilitatorOwnsTopic(file.topic_id, req.user!.id);
  await topicFileRepo.deleteFile(file.id);
  res.json({ ok: true });
});

import archiver from 'archiver';
import type { Response } from 'express';
import type { PokerSessionRow } from '../repositories/pokerSessionRepo.js';
import * as topicRepo from '../repositories/topicRepo.js';
import * as topicFileRepo from '../repositories/topicFileRepo.js';
import * as resultsRepo from '../repositories/resultsRepo.js';
import { topicFilePath } from './uploadService.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'topic';
}

export async function streamSessionExport(session: PokerSessionRow, res: Response): Promise<void> {
  const topics = await topicRepo.listBySession(session.id);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(session.name)}-export.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  const summaryLines: string[] = [`# ${session.name}`, '', `Exported: ${new Date().toISOString()}`, '', '## Topics', ''];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const folderName = `${String(i + 1).padStart(2, '0')}-${slugify(topic.name)}`;
    const files = await topicFileRepo.listByTopic(topic.id);
    const result = await resultsRepo.findByTopic(topic.id);

    summaryLines.push(
      `- **${topic.name}** — consensus: ${result?.consensus_value ?? '_none_'} (${result?.agreement_pct ?? 0}% agreement)`,
    );

    for (const file of files) {
      const diskPath = topicFilePath(topic.id, file.stored_filename);
      archive.file(diskPath, { name: `${folderName}/${file.original_filename}` });
    }
  }

  archive.append(summaryLines.join('\n'), { name: 'session-summary.md' });

  await archive.finalize();
}

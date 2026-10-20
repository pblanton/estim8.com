import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import type { VoteSummary } from '@estim8/shared';
import * as topicFileRepo from '../repositories/topicFileRepo.js';
import { topicFilePath, topicUploadDir } from './uploadService.js';

const RESULTS_FILENAME = 'Results.md';

export function resultsFilePath(topicId: string): string {
  return topicFilePath(topicId, RESULTS_FILENAME);
}

export async function writeResultsMarkdown(input: {
  topicId: string;
  topicName: string;
  sessionName: string;
  savedByDisplayName: string;
  savedAt: Date;
  consensusValue: string | null;
  agreementPct: number;
  notes: string | null;
  votes: VoteSummary[];
}): Promise<void> {
  const lines: string[] = [];
  lines.push(`# Results: ${input.topicName}`);
  lines.push('');
  lines.push(`- **Session**: ${input.sessionName}`);
  lines.push(`- **Saved**: ${input.savedAt.toISOString()} by ${input.savedByDisplayName}`);
  lines.push(`- **Consensus value**: ${input.consensusValue ?? '_none selected_'}`);
  lines.push(`- **Agreement**: ${input.agreementPct}%`);
  lines.push('');
  lines.push('## Discussion Notes');
  lines.push('');
  lines.push(input.notes?.trim() || '_No notes recorded._');
  lines.push('');
  lines.push('## Individual Votes');
  lines.push('');
  lines.push('| Player | Card |');
  lines.push('| --- | --- |');
  for (const vote of input.votes) {
    lines.push(`| ${vote.displayName} | ${vote.value} |`);
  }
  lines.push('');

  const content = lines.join('\n');
  mkdirSync(topicUploadDir(input.topicId), { recursive: true });
  const filePath = resultsFilePath(input.topicId);
  writeFileSync(filePath, content, 'utf8');
  const { size } = statSync(filePath);
  await topicFileRepo.upsertGeneratedMarkdown(input.topicId, RESULTS_FILENAME, size);
}

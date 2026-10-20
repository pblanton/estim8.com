import type { ConsensusSummary, VoteSummary } from '@estim8/shared';

export function computeConsensus(votes: VoteSummary[]): ConsensusSummary {
  if (votes.length === 0) {
    return { allEqual: false, agreementPct: 0, uniqueValues: [] };
  }

  const counts = new Map<string, number>();
  for (const vote of votes) {
    const value = vote.value.trim();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const uniqueValues = [...counts.keys()];
  const maxCount = Math.max(...counts.values());
  const agreementPct = Math.round((maxCount / votes.length) * 1000) / 10;
  const allEqual = uniqueValues.length === 1;

  return { allEqual, agreementPct, uniqueValues };
}

export function shouldCelebrate(consensus: ConsensusSummary, voteCount: number): boolean {
  return consensus.agreementPct === 100 && voteCount >= 2;
}

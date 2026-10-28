import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VoteSummary } from '@estim8/shared';
import { topicApi, type TopicResult } from '../../api/sessions';

interface ResultsPanelProps {
  topicId: string;
  topicName: string;
  votes: VoteSummary[];
  deckLabels: string[];
  onSaved: () => void;
  onDismiss: () => void;
}

export function ResultsPanel(props: ResultsPanelProps) {
  // Load anything the facilitator already saved for this topic so it can be reviewed and edited.
  // gcTime 0: drop the cache when the panel closes, so reopening always shows the latest save.
  const { data, isLoading } = useQuery({
    queryKey: ['topic-results', props.topicId],
    queryFn: () => topicApi.getResults(props.topicId),
    gcTime: 0,
  });

  if (isLoading) {
    return (
      <div className="results-overlay">
        <div className="results-panel">Loading results…</div>
      </div>
    );
  }
  return <ResultsForm {...props} saved={data?.results ?? null} />;
}

function ResultsForm({
  topicId,
  topicName,
  votes,
  deckLabels,
  saved,
  onSaved,
  onDismiss,
}: ResultsPanelProps & { saved: TopicResult | null }) {
  const [consensusValue, setConsensusValue] = useState(saved?.consensus_value ?? '');
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await topicApi.saveResults(topicId, consensusValue || null, notes.trim());
      onSaved();
    } catch {
      setError('Could not save results. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="results-overlay">
      <div className="results-panel">
        <h2>Results: {topicName}</h2>

        <table className="results-votes-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Card</th>
            </tr>
          </thead>
          <tbody>
            {votes.map((v) => (
              <tr key={v.participantId}>
                <td>{v.displayName}</td>
                <td>{v.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="form-stack" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="consensus">Team's final consensus value</label>
            <select id="consensus" value={consensusValue} onChange={(e) => setConsensusValue(e.target.value)}>
              <option value="">— none selected —</option>
              {/* Keep a previously saved value selectable even if the deck has changed since. */}
              {(consensusValue && !deckLabels.includes(consensusValue) ? [...deckLabels, consensusValue] : deckLabels).map(
                (label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="notes">Discussion notes</label>
            <textarea id="notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : saved ? 'Update results' : 'Save results'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={onDismiss}>
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

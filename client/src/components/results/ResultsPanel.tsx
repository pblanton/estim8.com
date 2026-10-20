import { useState, type FormEvent } from 'react';
import type { VoteSummary } from '@estim8/shared';
import { topicApi } from '../../api/sessions';

interface ResultsPanelProps {
  topicId: string;
  topicName: string;
  votes: VoteSummary[];
  deckLabels: string[];
  onSaved: () => void;
  onDismiss: () => void;
}

export function ResultsPanel({ topicId, topicName, votes, deckLabels, onSaved, onDismiss }: ResultsPanelProps) {
  const [consensusValue, setConsensusValue] = useState('');
  const [notes, setNotes] = useState('');
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
              {deckLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="notes">Discussion notes</label>
            <textarea id="notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save results'}
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

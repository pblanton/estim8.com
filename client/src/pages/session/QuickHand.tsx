import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { validateJoinCode } from '@estim8/shared';
import { AppHeader } from '../../components/layout/AppHeader';
import { JoinCodeField } from '../../components/forms/JoinCodeField';
import { deckApi } from '../../api/decks';
import { sessionApi } from '../../api/sessions';
import { ApiError } from '../../api/client';

/** Fibonacci system deck (seeded by migration 0002). */
const DEFAULT_DECK_ID = '00000000-0000-0000-0000-000000000001';

/** A one-round, one-topic session: name it, hit Play Now, and the table is ready. */
export function QuickHandPage() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['decks'], queryFn: deckApi.list });

  const [name, setName] = useState('');
  const [deckId, setDeckId] = useState(DEFAULT_DECK_ID);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Give the hand a name.');
      return;
    }
    if (joinCode.trim() && validateJoinCode(joinCode)) return;
    setBusy(true);
    try {
      const { session } = await sessionApi.createQuickHand(name.trim(), { deckId, joinCode: joinCode.trim() });
      navigate(`/play/${session.join_code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <AppHeader />
      <main className="app-main">
        <h1>Quick Hand</h1>
        <p style={{ color: '#666' }}>
          One topic, one round, no setup. Name it and the table is ready — share the link and play.
        </p>
        <form className="form-stack" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
          <div className="form-field">
            <label htmlFor="name">What are you estimating?</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PROJ-123: Fix the login redirect"
              maxLength={150}
              autoFocus
              required
            />
          </div>

          <details className="quick-hand-options">
            <summary>Options</summary>
            <div className="form-stack" style={{ marginTop: '0.9rem' }}>
              <div className="form-field">
                <label htmlFor="deck">Card deck</label>
                <select id="deck" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
                  {data?.decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name} ({deck.labels.join(', ')})
                    </option>
                  ))}
                  {!data && <option value={DEFAULT_DECK_ID}>Fibonacci</option>}
                </select>
              </div>
              <JoinCodeField value={joinCode} onChange={setJoinCode} />
            </div>
          </details>

          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Starting…' : 'Play Now'}
          </button>
        </form>
      </main>
    </div>
  );
}

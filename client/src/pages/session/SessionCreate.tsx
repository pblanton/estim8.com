import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../../components/layout/AppHeader';
import { deckApi } from '../../api/decks';
import { sessionApi } from '../../api/sessions';
import { ApiError } from '../../api/client';

const CUSTOM_OPTION = 'custom-new';

export function SessionCreatePage() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['decks'], queryFn: deckApi.list });

  const [name, setName] = useState('');
  const [deckId, setDeckId] = useState('');
  const [customName, setCustomName] = useState('My custom deck');
  const [customLabels, setCustomLabels] = useState('P1, P2, P3, P4, P5');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showCustomBuilder = deckId === CUSTOM_OPTION;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Session name is required.');
      return;
    }
    setBusy(true);
    try {
      let finalDeckId = deckId;
      if (showCustomBuilder) {
        const labels = customLabels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean);
        if (labels.length === 0) {
          setError('Enter at least one custom card label.');
          setBusy(false);
          return;
        }
        const { deck } = await deckApi.create(customName.trim() || 'Custom deck', labels);
        finalDeckId = deck.id;
      }
      if (!finalDeckId) {
        setError('Choose a card deck.');
        setBusy(false);
        return;
      }
      const { session } = await sessionApi.create(name.trim(), finalDeckId);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AppHeader />
      <main className="app-main">
        <h1>New session</h1>
        <form className="form-stack" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
          <div className="form-field">
            <label htmlFor="name">Session name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 42 Grooming" required />
          </div>

          <div className="form-field">
            <label htmlFor="deck">Card deck</label>
            <select id="deck" value={deckId} onChange={(e) => setDeckId(e.target.value)} required>
              <option value="" disabled>
                Choose a deck…
              </option>
              {data?.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name} ({deck.labels.join(', ')})
                </option>
              ))}
              <option value={CUSTOM_OPTION}>+ Create a new custom deck…</option>
            </select>
          </div>

          {showCustomBuilder && (
            <>
              <div className="form-field">
                <label htmlFor="customName">Custom deck name</label>
                <input id="customName" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="customLabels">Card labels (comma-separated, in order)</label>
                <input id="customLabels" value={customLabels} onChange={(e) => setCustomLabels(e.target.value)} />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create session'}
          </button>
        </form>
      </main>
    </div>
  );
}

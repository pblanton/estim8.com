import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../components/layout/AppHeader';
import { sessionApi, topicApi } from '../../api/sessions';
import { ApiError } from '../../api/client';

export function SessionEditPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.get(sessionId!),
    enabled: Boolean(sessionId),
  });

  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createTopic = useMutation({
    mutationFn: () => topicApi.create(sessionId!, topicName.trim(), topicDescription.trim() || null),
    onSuccess: () => {
      setTopicName('');
      setTopicDescription('');
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    },
  });

  const sendInvites = useMutation({
    mutationFn: (emails: string[]) => sessionApi.invite(sessionId!, emails),
    onSuccess: (res) => {
      const sent = res.results.filter((r) => r.sent).length;
      const failed = res.results.filter((r) => !r.sent).map((r) => r.email);
      setInviteStatus(
        failed.length > 0 ? `Sent ${sent}, failed: ${failed.join(', ')}` : `Invitations sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`,
      );
      setInviteEmails('');
    },
  });

  const purgeSession = useMutation({
    mutationFn: () => sessionApi.purge(sessionId!),
    onSuccess: () => navigate('/dashboard'),
  });

  async function onCreateTopic(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!topicName.trim()) return;
    try {
      await createTopic.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create topic.');
    }
  }

  function onSendInvites(e: FormEvent) {
    e.preventDefault();
    setInviteStatus(null);
    const emails = inviteEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    sendInvites.mutate(emails);
  }

  function onPurge() {
    if (
      window.confirm(
        'This permanently deletes this session, every topic, every uploaded file, and all votes/results right now. This cannot be undone. Continue?',
      )
    ) {
      purgeSession.mutate();
    }
  }

  if (isLoading || !data) {
    return (
      <div>
        <AppHeader />
        <main className="app-main">Loading…</main>
      </div>
    );
  }

  const { session, topics } = data;

  return (
    <div>
      <AppHeader />
      <main className="app-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{session.name}</h1>
          <span className={`status-pill ${session.status}`}>{session.status}</span>
        </div>

        <p>
          Join code: <span className="join-code">{session.join_code}</span> &nbsp;·&nbsp; Share:{' '}
          <code>{window.location.origin}/join/{session.join_code}</code>
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link to={`/play/${session.join_code}`} className="btn btn-primary">
            Open play table
          </Link>
          <a className="btn btn-secondary" href={sessionApi.exportUrl(session.id)}>
            Download ZIP export
          </a>
          <button className="btn btn-danger" onClick={onPurge} disabled={purgeSession.isPending}>
            Purge session now
          </button>
        </div>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Topics</h2>
          <div className="topic-list">
            {topics.map((topic) => (
              <div className="topic-row" key={topic.id}>
                <div>
                  <strong>{topic.name}</strong> <span style={{ color: '#888' }}>({topic.status})</span>
                </div>
                <Link to={`/sessions/${session.id}/topics/${topic.id}/edit`} className="btn btn-secondary btn-small">
                  Edit / upload files
                </Link>
              </div>
            ))}
            {topics.length === 0 && <p>No topics yet — add your first one below.</p>}
          </div>

          <form className="form-stack" onSubmit={onCreateTopic}>
            <div className="form-field">
              <label htmlFor="topicName">New topic name</label>
              <input id="topicName" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Login redesign" />
            </div>
            <div className="form-field">
              <label htmlFor="topicDescription">Description</label>
              <textarea
                id="topicDescription"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                rows={3}
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={createTopic.isPending}>
              Add topic
            </button>
          </form>
        </section>

        <section>
          <h2>Invite players</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Up to 10 players can join. Enter one email per line, or just share the join link above in chat —
            whichever is easier.
          </p>
          <form className="form-stack" onSubmit={onSendInvites}>
            <div className="form-field">
              <label htmlFor="inviteEmails">Email addresses</label>
              <textarea
                id="inviteEmails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={4}
                placeholder={'alice@example.com\nbob@example.com'}
              />
            </div>
            {inviteStatus && <div className="form-success">{inviteStatus}</div>}
            <button className="btn btn-primary" type="submit" disabled={sendInvites.isPending}>
              Send invites
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

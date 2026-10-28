import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { sessionApi } from '../../api/sessions';

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FacilitatorDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: sessionApi.list });

  return (
    <div>
      <AppHeader />
      <main className="app-main">
        <div className="retention-banner">
          Sessions and their files are temporary: they're deleted automatically 7 days after you complete them (or
          after 30 days of inactivity on an unfinished session). Export a ZIP any time you want to keep something.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Your sessions</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/sessions/quick-hand" className="btn btn-secondary">
              ⚡ Quick Hand
            </Link>
            <Link to="/sessions/new" className="btn btn-primary">
              + New session
            </Link>
          </div>
        </div>

        {isLoading && <p>Loading…</p>}

        {data && data.sessions.length === 0 && <p>You haven't created any sessions yet.</p>}

        <div className="session-list">
          {data?.sessions.map((session) => (
            <Link to={`/sessions/${session.id}`} key={session.id} className="session-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{session.name}</strong>
                <span className={`status-pill ${session.status}`}>{session.status}</span>
              </div>
              <p>
                Join code: <span className="join-code">{session.join_code}</span>
              </p>
              {session.status === 'completed' && session.purge_at && (
                <p style={{ fontSize: '0.85rem', color: '#a85c00' }}>Purges on {formatDate(session.purge_at)}</p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

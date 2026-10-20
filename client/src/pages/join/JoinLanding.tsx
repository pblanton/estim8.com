import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sessionApi } from '../../api/sessions';
import { ApiError } from '../../api/client';
import logo from '../../assets/estim8-header-logo.png';

export const DISPLAY_NAME_KEY_PREFIX = 'estim8_display_name_';

export function JoinLandingPage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!joinCode) return;
    sessionApi
      .byJoinCode(joinCode)
      .then((res) => {
        setSessionName(res.session.name);
        setStatus(res.session.status);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      });
  }, [joinCode]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !joinCode) return;
    sessionStorage.setItem(`${DISPLAY_NAME_KEY_PREFIX}${joinCode}`, displayName.trim());
    navigate(`/play/${joinCode}`);
  }

  if (notFound) {
    return (
      <div className="join-full-page">
        <div className="auth-card">
          <img src={logo} alt="estim8.com" className="brand-logo" />
          <h1>Session not found</h1>
          <p>Double-check the link your facilitator sent you.</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="join-full-page">
        <div className="auth-card">
          <img src={logo} alt="estim8.com" className="brand-logo" />
          <h1>This session has ended</h1>
          <p>Ask your facilitator for a new session link if you need to estimate something else.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-full-page">
      <div className="auth-card">
        <img src={logo} alt="estim8.com" className="brand-logo" />
        <h1>{sessionName ? `Join "${sessionName}"` : 'Join session'}</h1>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Your name</label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we show your name at the table?"
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Join the table
          </button>
        </form>
      </div>
    </div>
  );
}

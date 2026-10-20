import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import logo from '../../assets/estim8-header-logo.png';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.register(email.trim(), displayName.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="centered-page">
        <div className="auth-card">
          <img src={logo} alt="estim8.com" className="brand-logo" />
          <h1>Check your email</h1>
          <p>
            We sent a verification link and a 6-digit code to <strong>{email}</strong>. Click the link, or{' '}
            <Link to={`/verify-email?email=${encodeURIComponent(email)}`}>enter the code manually</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-page">
      <div className="auth-card">
        <img src={logo} alt="estim8.com" className="brand-logo" />
        <h1>Create your facilitator account</h1>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Your name</label>
            <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
}

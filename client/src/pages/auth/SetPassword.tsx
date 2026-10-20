import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { VERIFICATION_TICKET_KEY } from './VerifyEmail';
import logo from '../../assets/estim8-header-logo.png';

export function SetPasswordPage() {
  const ticket = sessionStorage.getItem(VERIFICATION_TICKET_KEY);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ticket) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.setPassword(ticket!, password);
      sessionStorage.removeItem(VERIFICATION_TICKET_KEY);
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? 'This verification session has expired. Please start the sign-up process again.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered-page">
      <div className="auth-card">
        <img src={logo} alt="estim8.com" className="brand-logo" />
        <h1>Set your password</h1>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Set password and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

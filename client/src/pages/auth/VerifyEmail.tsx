import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import logo from '../../assets/estim8-header-logo.png';

export const VERIFICATION_TICKET_KEY = 'estim8_verification_ticket';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(Boolean(token));

  function onVerified(verificationTicket: string) {
    sessionStorage.setItem(VERIFICATION_TICKET_KEY, verificationTicket);
    navigate('/set-password');
  }

  useEffect(() => {
    if (!token) return;
    authApi
      .verifyByToken(token)
      .then((res) => onVerified(res.verificationTicket))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'This verification link is invalid or has expired.');
        setAutoVerifying(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.verifyByCode(email.trim(), code.trim());
      onVerified(res.verificationTicket);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  }

  if (autoVerifying) {
    return (
      <div className="centered-page">
        <div className="auth-card">
          <img src={logo} alt="estim8.com" className="brand-logo" />
          <h1>Verifying…</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-page">
      <div className="auth-card">
        <img src={logo} alt="estim8.com" className="brand-logo" />
        <h1>Enter your verification code</h1>
        <p>Check your email for the 6-digit code we sent you.</p>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="code">6-digit code</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}

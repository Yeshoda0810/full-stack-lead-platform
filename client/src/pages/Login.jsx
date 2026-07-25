import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-center">
      <form className="card" style={{ padding: 36, width: 380 }} onSubmit={onSubmit}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Sign in</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 24 }}>Lead Platform team access.</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="card" style={{ marginTop: 20, padding: 12, background: 'var(--bg)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Demo accounts — admin@leadplatform.demo / AdminDemo123! · member@leadplatform.demo / MemberDemo123!
        </div>
      </form>
    </div>
  );
}

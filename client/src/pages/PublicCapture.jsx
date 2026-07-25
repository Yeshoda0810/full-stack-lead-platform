import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';

export default function PublicCapture() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [error, setError] = useState('');

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await api.captureLead(form);
      setStatus('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="page-center">
        <div className="card" style={{ padding: 40, maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 10 }}>Thanks, {form.name.split(' ')[0]}.</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Someone from our team will reach out shortly. In the meantime, feel free to reply to
            our confirmation email with anything else useful.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <form className="card" style={{ padding: 36, width: 420 }} onSubmit={onSubmit}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Talk to sales</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 24 }}>
          Tell us a little about what you're looking for.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" required value={form.name} onChange={update('name')} placeholder="Jordan Lee" />
        </div>
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" required value={form.email} onChange={update('email')} placeholder="jordan@company.com" />
        </div>
        <div className="field">
          <label htmlFor="company">Company (optional)</label>
          <input id="company" value={form.company} onChange={update('company')} placeholder="Company name" />
        </div>
        <div className="field">
          <label htmlFor="message">What are you looking for? (optional)</label>
          <textarea id="message" rows={3} value={form.message} onChange={update('message')} placeholder="A quick line is enough" />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send'}
        </button>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)' }}>
          Work here? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];
const STATUS_LABEL = { NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', WON: 'Won', LOST: 'Lost' };

const ACTION_LABEL = {
  lead_captured: 'came in through the public form',
  reassigned: 'updated the assignment',
  status_changed: 'changed the status',
  note_added: 'added a note',
};

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, userList] = await Promise.all([api.getLead(id), api.users()]);
      setData(detail);
      setUsers(userList.users);
    } catch {
      setError('Could not load this lead.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const canEditStatus = data && (user.role === 'ADMIN' || data.lead.assignedToId === user.id);

  async function onStatusChange(e) {
    setActionError('');
    try {
      await api.updateStatus(id, e.target.value);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  async function onAssignChange(e) {
    setActionError('');
    try {
      await api.assignLead(id, e.target.value || null);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update assignment.');
    }
  }

  async function onAddNote(e) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    setActionError('');
    try {
      await api.addNote(id, noteBody);
      setNoteBody('');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not save the note.');
    } finally {
      setSavingNote(false);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="empty-state">Loading…</div>;

  const { lead, notes, activity } = data;

  return (
    <div>
      <Link to="/app" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>← Back to pipeline</Link>

      <header className="page-header" style={{ marginTop: 10 }}>
        <div>
          <h1>{lead.name}</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4 }}>
            {lead.email} {lead.company && `· ${lead.company}`}
          </p>
        </div>
        <span className={`status-pill status-${lead.status.toLowerCase()}`}>{STATUS_LABEL[lead.status]}</span>
      </header>

      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="detail-grid">
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Notes</h3>
            {notes.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>No notes yet.</p>}
            <ul className="note-list">
              {notes.map((n) => (
                <li key={n.id}>
                  <p style={{ margin: 0 }}>{n.body}</p>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <form onSubmit={onAddNote} style={{ marginTop: 14 }}>
              <textarea
                rows={2}
                placeholder="Log a call, an email, anything worth remembering…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={savingNote}>
                {savingNote ? 'Saving…' : 'Add note'}
              </button>
            </form>
          </div>

          {lead.message && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 10 }}>Original message</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{lead.message}</p>
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={lead.status} onChange={onStatusChange} disabled={!canEditStatus}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              {!canEditStatus && (
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  Only the assigned rep or an admin can change this.
                </p>
              )}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="assign">Assigned to</label>
              <select id="assign" value={lead.assignedToId || ''} onChange={onAssignChange} disabled={user.role !== 'ADMIN'}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {user.role !== 'ADMIN' && (
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>Only admins can reassign leads.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Activity</h3>
            <ol className="timeline">
              {activity.map((a) => (
                <li key={a.id}>
                  <span className="timeline-dot" />
                  <div>
                    <div style={{ fontSize: 13 }}>
                      <strong>{a.actorName || 'The system'}</strong> {ACTION_LABEL[a.action] || a.action}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

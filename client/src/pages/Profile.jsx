import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <header className="page-header">
        <h1>Profile</h1>
      </header>
      <div className="card" style={{ padding: 24, maxWidth: 420 }}>
        <div className="field">
          <label>Name</label>
          <div style={{ fontSize: 15 }}>{user.name}</div>
        </div>
        <div className="field">
          <label>Email</label>
          <div style={{ fontSize: 15 }}>{user.email}</div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Role</label>
          <span className="status-pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {user.role === 'ADMIN' ? 'Admin' : 'Member'}
          </span>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10 }}>
            {user.role === 'ADMIN'
              ? 'Admins can reassign any lead and change the status of any lead in the pipeline.'
              : 'Members can view the full pipeline, add notes to any lead, and update the status of leads assigned to them.'}
          </p>
        </div>
      </div>
    </div>
  );
}

import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="page-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span> Lead Platform
        </div>
        <nav>
          <NavLink to="/app" end className="nav-link">Pipeline</NavLink>
          <NavLink to="/app/profile" className="nav-link">Profile</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{user.role === 'ADMIN' ? 'Admin' : 'Member'}</div>
          </div>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

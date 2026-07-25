import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_LABEL = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  LOST: 'Lost',
};

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', assignedTo: '', q: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listLeads({ ...filters, page, pageSize: 10 });
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch {
      setError('Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4 }}>
            {pagination.total} lead{pagination.total === 1 ? '' : 's'} total
          </p>
        </div>
      </header>

      <div className="toolbar">
        <input
          placeholder="Search name, email, company…"
          value={filters.q}
          onChange={(e) => updateFilter('q', e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filters.assignedTo} onChange={(e) => updateFilter('assignedTo', e.target.value)}>
          <option value="">Everyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className="empty-state">
            <strong>No leads match these filters.</strong>
            <div style={{ marginTop: 4 }}>Try clearing search or switching the status filter.</div>
          </div>
        ) : (
          <table className="lead-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link to={`/app/leads/${lead.id}`} className="lead-name-link">{lead.name}</Link>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{lead.email}</div>
                  </td>
                  <td>{lead.company || '—'}</td>
                  <td><span className={`status-pill status-${lead.status.toLowerCase()}`}>{STATUS_LABEL[lead.status]}</span></td>
                  <td>{lead.assignedToName || <span style={{ color: 'var(--ink-soft)' }}>Unassigned</span>}</td>
                  <td style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

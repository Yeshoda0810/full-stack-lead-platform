const BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const stored = token || localStorage.getItem('lp_token');
  if (stored) headers.Authorization = `Bearer ${stored}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  users: () => request('/users'),
  captureLead: (payload) => request('/leads/public', { method: 'POST', body: payload }),
  listLeads: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    return request(`/leads?${qs}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  updateStatus: (id, status) => request(`/leads/${id}/status`, { method: 'PATCH', body: { status } }),
  assignLead: (id, assignedToId) => request(`/leads/${id}/assign`, { method: 'PATCH', body: { assignedToId } }),
  addNote: (id, body) => request(`/leads/${id}/notes`, { method: 'POST', body: { body } }),
};

export { ApiError };

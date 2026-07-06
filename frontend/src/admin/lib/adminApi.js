const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');
const STORAGE_KEY = 'ne_admin_key';

export function getAdminKey() {
  return sessionStorage.getItem(STORAGE_KEY) ?? import.meta.env.VITE_ADMIN_API_KEY ?? '';
}

export function setAdminKey(key) {
  if (key) sessionStorage.setItem(STORAGE_KEY, key);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function clearAdminKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function adminFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
      ...opts.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => ({}));
    clearAdminKey();
    throw new Error(body?.error?.message ?? 'Invalid or missing admin key');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? res.statusText);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/csv')) return res.text();
  return res.json();
}

export const getHealth = () => adminFetch('/v1/admin/health');
export const getStats = (days = 7, includeTestRuns = false) =>
  adminFetch(`/v1/admin/stats?days=${days}${includeTestRuns ? '&include_test_runs=true' : ''}`);
export const listRuns = (params = {}) => {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', params.limit);
  if (params.offset) q.set('offset', params.offset);
  if (params.status) q.set('status', params.status);
  if (params.q) q.set('q', params.q);
  if (params.run_source) q.set('run_source', params.run_source);
  return adminFetch(`/v1/admin/runs?${q}`);
};
export const getRun = (id) => adminFetch(`/v1/admin/runs/${id}`);
export const getRunPipeline = (id) => adminFetch(`/v1/admin/runs/${id}/layers`);
export const getLlmRequests = (runId) => adminFetch(`/v1/admin/llm-requests?run_id=${runId}`);
export const getConfig = () => adminFetch('/v1/admin/config');
export const getPatterns = () => adminFetch('/v1/admin/patterns');

export const getAnalyticsMessaging = () => adminFetch('/v1/admin/analytics/messaging-problems');
export const getAnalyticsModels = () => adminFetch('/v1/admin/analytics/model-performance');
export const getAnalyticsCogs = (days = 30) => adminFetch(`/v1/admin/analytics/cogs-revenue?days=${days}`);
export const getAnalyticsFailures = (days = 30) => adminFetch(`/v1/admin/analytics/failures?days=${days}`);

export const exportRunsCsv = (params = {}) => {
  const q = new URLSearchParams(params);
  return adminFetch(`/v1/admin/reports/runs.csv?${q}`);
};
export const exportCostsCsv = (days = 30) => adminFetch(`/v1/admin/reports/costs.csv?days=${days}`);

export const createPlaygroundRun = (body) =>
  adminFetch('/v1/admin/playground/runs', { method: 'POST', body: JSON.stringify(body) });
export const runPlaygroundPipeline = (id, body) =>
  adminFetch(`/v1/admin/playground/runs/${id}/run`, { method: 'POST', body: JSON.stringify(body) });
export const runPlaygroundLayer = (id, layerKey, body = {}) =>
  adminFetch(`/v1/admin/playground/runs/${id}/layers/${layerKey}/run`, { method: 'POST', body: JSON.stringify(body) });
export const previewPlaygroundLayer = (id, layerKey) =>
  adminFetch(`/v1/admin/playground/runs/${id}/layers/${layerKey}/preview`, { method: 'POST', body: '{}' });
export const retryPlaygroundLayer = (id, layerKey) =>
  adminFetch(`/v1/admin/playground/runs/${id}/layers/${layerKey}/retry`, { method: 'POST', body: '{}' });
export const finalizePlaygroundRun = (id) =>
  adminFetch(`/v1/admin/playground/runs/${id}/finalize`, { method: 'POST', body: '{}' });

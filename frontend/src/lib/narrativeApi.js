const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function parseJsonResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || res.statusText || 'Request failed');
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export function getSessionId() {
  let id = localStorage.getItem('ne_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ne_session_id', id);
  }
  return id;
}

export async function createNarrativeRun(payload) {
  const res = await fetch(`${API_URL}/v1/narrative-runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function getRunStatus(runId) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}`);
  return parseJsonResponse(res);
}

export async function verifyEmail(runId, email) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function getRunOutputs(runId, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}/outputs`, { headers });
  return parseJsonResponse(res);
}

export async function getPricingTiers() {
  const res = await fetch(`${API_URL}/v1/pricing-tiers`);
  return parseJsonResponse(res);
}

export async function getPublicShare(shareId) {
  const res = await fetch(`${API_URL}/v1/results/${shareId}`);
  return parseJsonResponse(res);
}

export { API_URL };

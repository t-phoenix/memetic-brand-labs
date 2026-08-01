/** API base URL — must be set at build time on Vercel (VITE_API_URL). */
export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

if (import.meta.env.PROD && !API_URL) {
  console.error(
    'VITE_API_URL is not set. Add it in Vercel → Project Settings → Environment Variables, then redeploy.',
  );
}

export function parseApiError(data, fallback = 'Request failed') {
  const err = data?.error ?? {};
  return {
    code: err.code || 'unknown',
    message: err.message || fallback,
    userMessage: err.user_message || err.message || fallback,
    retryable: Boolean(err.retryable),
    recoveryActions: err.recovery_actions || [],
    attemptId: err.attempt_id,
  };
}

export async function parseJsonResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || res.statusText || 'Request failed');
  }
  if (!res.ok) {
    const parsed = parseApiError(data, text || res.statusText);
    const err = new Error(parsed.userMessage);
    err.code = parsed.code;
    err.recoveryActions = parsed.recoveryActions;
    err.attemptId = parsed.attemptId;
    err.retryable = parsed.retryable;
    err.status = res.status;
    err.raw = data;
    throw err;
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

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function createNarrativeRun(payload) {
  const res = await fetch(`${API_URL}/v1/narrative-runs`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'X-Session-Id': getSessionId(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function startNarrativeRunWithOAuth(intake, token) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/start`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'X-Session-Id': getSessionId(),
    },
    body: JSON.stringify({ ...intake, auth_method: 'oauth' }),
  });
  return parseJsonResponse(res);
}

export async function createIntakeSession(intake) {
  const res = await fetch(`${API_URL}/v1/intake-sessions`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'X-Session-Id': getSessionId(),
    },
    body: JSON.stringify(intake),
  });
  return parseJsonResponse(res);
}

export async function requestIntakeEmailVerification(intakeId, email) {
  const res = await fetch(`${API_URL}/v1/intake-sessions/${intakeId}/request-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function resendIntakeEmailVerification(intakeId, email) {
  const res = await fetch(`${API_URL}/v1/intake-sessions/${intakeId}/resend-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function confirmIntakeEmailVerification(intakeId, email, attemptId) {
  const res = await fetch(`${API_URL}/v1/intake-sessions/${intakeId}/confirm-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, attempt_id: attemptId }),
  });
  return parseJsonResponse(res);
}

export async function getHumanUnlockQuote() {
  const res = await fetch(`${API_URL}/v1/commerce/human-unlock-quote`);
  return parseJsonResponse(res);
}

export async function analyzeWebsiteForForm(website) {
  const res = await fetch(`${API_URL}/v1/website-intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website }),
  });
  return parseJsonResponse(res);
}

export async function getRunStatus(runId, token) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}`, {
    headers: authHeaders(token),
  });
  return parseJsonResponse(res);
}

export async function getAccessStatus(runId) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/access-status`);
  return parseJsonResponse(res);
}

export async function requestEmailVerification(runId, email) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/request-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

/** @deprecated use requestEmailVerification */
export async function verifyEmail(runId, email) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}/verify-email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function resendEmailVerification(runId, email) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/resend-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function confirmEmailVerification(runId, email, attemptId) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/confirm-email-verification`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, attempt_id: attemptId }),
  });
  return parseJsonResponse(res);
}

export async function unlockWithOAuth(runId, token) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/unlock/oauth`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  return parseJsonResponse(res);
}

export async function getOAuthStatus(token) {
  const res = await fetch(`${API_URL}/v1/auth/oauth-status`, {
    headers: authHeaders(token),
  });
  return parseJsonResponse(res);
}

export async function getEmailStatus(email) {
  const res = await fetch(
    `${API_URL}/v1/auth/email-status?email=${encodeURIComponent(email)}`,
    { headers: authHeaders() },
  );
  return parseJsonResponse(res);
}

export async function unlockWithPayment(runId, paymentHeader, idempotencyKey) {
  const headers = authHeaders();
  if (paymentHeader) {
    headers['payment-signature'] = paymentHeader;
    headers['idempotency-key'] = idempotencyKey || crypto.randomUUID();
  }
  const res = await fetch(`${API_URL}/v1/runs/${runId}/unlock`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  return parseJsonResponse(res);
}

export async function getPaymentStatus(runId, attemptId) {
  const q = attemptId ? `?attempt_id=${encodeURIComponent(attemptId)}` : '';
  const res = await fetch(`${API_URL}/v1/runs/${runId}/payment-status${q}`);
  return parseJsonResponse(res);
}

export async function resendResultsEmail(runId, email) {
  const res = await fetch(`${API_URL}/v1/runs/${runId}/resend-results-email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(res);
}

export async function getRunOutputs(runId, token) {
  const res = await fetch(`${API_URL}/v1/narrative-runs/${runId}/outputs`, {
    headers: authHeaders(token),
  });
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

export async function getCapabilities() {
  const res = await fetch(`${API_URL}/v1/capabilities`);
  return parseJsonResponse(res);
}

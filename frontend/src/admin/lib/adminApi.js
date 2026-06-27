const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
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

  return res.json();
}

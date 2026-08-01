const STORAGE_KEY = 'ne_pending_intake';

const INTAKE_FIELDS = ['building', 'audience', 'challenge', 'differentiation', 'website', 'model_tier'];

function normalizeIntake(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!String(raw.building || '').trim()) return null;
  const intake = {};
  for (const key of INTAKE_FIELDS) {
    if (raw[key] != null && raw[key] !== '') intake[key] = raw[key];
  }
  intake.model_tier = intake.model_tier || 'fast';
  return intake;
}

/** Persist narrative form answers across OAuth redirects and page reloads. */
export function savePendingIntake(intake) {
  const normalized = normalizeIntake(intake);
  if (!normalized) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore quota / private mode errors — navigation state may still work.
  }
}

export function getPendingIntake() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeIntake(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPendingIntake() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** Prefer React Router state; fall back to sessionStorage after OAuth reload. */
export function resolveAuthorizeIntake(locationIntake) {
  if (locationIntake?.building) {
    savePendingIntake(locationIntake);
    return normalizeIntake(locationIntake);
  }
  return getPendingIntake();
}

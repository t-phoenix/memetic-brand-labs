import type { Env } from '../config/env.js';

/** Pattern Library injection — off by default until retrieval strategy is reworked. */
export function isPatternLibraryEnabled(env: Env): boolean {
  return env.PATTERN_LIBRARY_ENABLED === true;
}

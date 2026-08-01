export function buildMagicLinkRedirect(
  frontendUrl: string,
  params: {
    attemptId: string;
    email: string;
    intakeId?: string;
    runId?: string;
  },
): string {
  const url = new URL(`${frontendUrl.replace(/\/$/, '')}/narrative-engine/verify-email`);
  if (params.intakeId) url.searchParams.set('intake_id', params.intakeId);
  if (params.runId) url.searchParams.set('run_id', params.runId);
  url.searchParams.set('attempt_id', params.attemptId);
  url.searchParams.set('email', params.email);
  return url.toString();
}

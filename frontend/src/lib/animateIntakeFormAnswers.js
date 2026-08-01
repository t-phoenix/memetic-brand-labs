export const INTAKE_FORM_FIELDS = ['building', 'audience', 'challenge', 'differentiation'];

const MAX_DURATION_MS = 4200;
const MIN_MS_PER_CHAR = 10;
const MAX_MS_PER_CHAR = 32;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type answers into form fields sequentially — total animation capped under ~4.2s.
 */
export async function animateIntakeFormAnswers(answers, onPatch, onActiveField, signal) {
  const texts = INTAKE_FORM_FIELDS.map((field) => answers[field] || '');
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  if (!totalChars) return;

  const msPerChar = Math.min(
    MAX_MS_PER_CHAR,
    Math.max(MIN_MS_PER_CHAR, MAX_DURATION_MS / totalChars),
  );

  onPatch(Object.fromEntries(INTAKE_FORM_FIELDS.map((field) => [field, ''])));

  for (let i = 0; i < INTAKE_FORM_FIELDS.length; i += 1) {
    const field = INTAKE_FORM_FIELDS[i];
    const text = texts[i];
    if (!text) continue;

    onActiveField?.(field);

    for (let char = 1; char <= text.length; char += 1) {
      if (signal?.aborted) {
        onActiveField?.(null);
        return;
      }
      onPatch({ [field]: text.slice(0, char) });
      await delay(msPerChar);
    }
  }

  onActiveField?.(null);
}

const BLOCKLIST = [/viral/i, /guaranteed/i, /lfg/i, /wagmi/i];

export interface GuardrailResult {
  passed: boolean;
  events: Array<{ check_key: string; passed: boolean; details: Record<string, unknown>; action_taken: string }>;
}

export class OutputGuardrailService {
  check(cards: Record<string, string>, showAnalogy: boolean): GuardrailResult {
    const events: GuardrailResult['events'] = [];
    let passed = true;

    for (const [key, text] of Object.entries(cards)) {
      for (const pattern of BLOCKLIST) {
        if (pattern.test(text)) {
          events.push({
            check_key: 'blocklist',
            passed: false,
            details: { card: key, pattern: pattern.source },
            action_taken: 'flag',
          });
          passed = false;
        }
      }
      if (key === 'messaging_hook' && text.split(/[.!?]/).filter(Boolean).length > 1) {
        events.push({
          check_key: 'hook_length',
          passed: false,
          details: { sentences: text.split(/[.!?]/).length },
          action_taken: 'flag',
        });
        passed = false;
      }
      if (!showAnalogy && /uber for/i.test(text)) {
        events.push({
          check_key: 'forced_analogy',
          passed: false,
          details: { card: key },
          action_taken: 'flag',
        });
        passed = false;
      }
    }

    if (!events.length) {
      events.push({ check_key: 'all', passed: true, details: {}, action_taken: 'pass' });
    }

    return { passed, events };
  }
}

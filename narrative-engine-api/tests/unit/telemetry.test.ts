import { describe, it, expect } from 'vitest';
import { TelemetryService } from '../../src/telemetry/TelemetryService.js';
import { STAGE_PROGRESS, CARD_DEFINITIONS } from '../../src/types/index.js';

describe('Telemetry contracts', () => {
  it('defines all pipeline stages', () => {
    expect(STAGE_PROGRESS.interpretation).toBeDefined();
    expect(STAGE_PROGRESS.completed.pct).toBe(100);
  });

  it('defines four output cards', () => {
    expect(CARD_DEFINITIONS).toHaveLength(4);
  });
});

describe('TelemetryService', () => {
  it('fail-open emit with broken db', async () => {
    const mockDb = {
      from: () => ({
        insert: async () => ({ error: new Error('fail') }),
      }),
    } as unknown as ConstructorParameters<typeof TelemetryService>[0];
    const t = new TelemetryService(mockDb);
    await expect(t.emit('00000000-0000-0000-0000-000000000001', 'test')).resolves.toBeUndefined();
  });
});

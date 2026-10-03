import { describe, expect, it } from 'vitest';
import { BOAT_COST_USD, KOTOV_VALUE_MUSD, PAYLOAD_MAX_KG } from './fleet';

describe('fleet figures', () => {
  it('costs about a quarter of a million dollars and carries up to 320 kg', () => {
    expect(BOAT_COST_USD).toEqual([250000, 273000]);
    expect(PAYLOAD_MAX_KG).toBe(320);
  });

  it('quotes the patrol ship at the value GUR gave', () => {
    expect(KOTOV_VALUE_MUSD).toBe(65);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { createChainsawStore } from '../state';
import { CLUTCH_TONES } from '../theme';
import { CHAINSAW_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;

function row(id: string) {
  const found = CHAINSAW_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the engine, the chain and the clutch', () => {
    expect(CHAINSAW_READOUTS.map((readout) => readout.id)).toEqual(['rpm', 'chain', 'clutch']);
    CHAINSAW_READOUTS.forEach((readout) => expect(readout.labelKey).toBe(`readouts.${readout.id}`));
    expect(row('clutch').numeric).toBe(false);
  });

  it('fills both meters at full throttle and empties the chain one at idle', () => {
    const full = createChainsawStore().getState();
    expect(row('rpm').value(full)).toBe(fill(units.rpm, { value: '9,900' }));
    expect(row('chain').value(full)).toBe(fill(units.metresPerSecond, { value: '22.0' }));
    expect(row('rpm').meter?.share(full)).toBe(1);
    expect(row('chain').meter?.share(full)).toBeCloseTo(1, 9);
    const idle = createChainsawStore({ throttle: 0 }).getState();
    expect(row('rpm').value(idle)).toBe(fill(units.rpm, { value: '2,700' }));
    expect(row('chain').meter?.share(idle)).toBe(0);
    expect(row('clutch').value(idle)).toBe(readouts.clutchState.open);
    expect(row('clutch').tone?.(idle)).toBe(CLUTCH_TONES.open);
  });
});

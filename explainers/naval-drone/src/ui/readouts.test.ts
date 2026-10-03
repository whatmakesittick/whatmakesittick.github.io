import { describe, expect, it } from 'vitest';
import { createNavalDroneStore } from '../state';
import { THEME } from '../theme';
import { NAVAL_DRONE_READOUTS } from './readouts';

function readout(id: string) {
  const found = NAVAL_DRONE_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

describe('gauge readouts', () => {
  it('shows the clock, the speed, the hull mode and the distance to the ship', () => {
    expect(NAVAL_DRONE_READOUTS.map((row) => row.id)).toEqual([
      'clock',
      'speed',
      'mode',
      'distance',
    ]);
    NAVAL_DRONE_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
    expect(NAVAL_DRONE_READOUTS.map((row) => row.numeric)).toEqual([true, true, false, true]);
  });

  it('tints the hull mode with its tone', () => {
    const tone = readout('mode').tone;
    expect(tone?.(createNavalDroneStore({ phase: 0 }).getState())).toBe(THEME.floating);
    expect(tone?.(createNavalDroneStore({ phase: 28 }).getState())).toBe(THEME.hump);
    expect(tone?.(createNavalDroneStore({ phase: 60 }).getState())).toBe(THEME.planing);
    expect(tone?.(createNavalDroneStore({ phase: 60, trialKnots: 4 }).getState())).toBe(
      THEME.floating,
    );
  });

  it('meters nothing', () => {
    NAVAL_DRONE_READOUTS.forEach((row) => expect(row.meter, row.id).toBeUndefined());
  });
});

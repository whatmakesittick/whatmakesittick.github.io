import { describe, expect, it } from 'vitest';
import { SORTIE_SECONDS, batteryAt } from '../model';
import { createFpvStore } from '../state';
import type { FpvStoreState } from '../state';
import { THEME } from '../theme';
import { FPV_READOUTS } from './readouts';

function readout(id: string) {
  const found = FPV_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(phase: number, payload = 300): FpvStoreState {
  return createFpvStore({ phase, payload }).getState();
}

describe('gauge readouts', () => {
  it('shows the clock, the speed, the height, the battery and the distance', () => {
    expect(FPV_READOUTS.map((row) => row.id)).toEqual([
      'clock',
      'speed',
      'height',
      'battery',
      'distance',
    ]);
    FPV_READOUTS.forEach((row) => expect(row.numeric, row.id).toBe(true));
    FPV_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
  });

  it('fills the battery meter with what is left in the pack', () => {
    const { meter } = readout('battery');
    expect(meter?.fill).toBe(THEME.battery);
    expect(meter?.share(stateAt(0))).toBe(1);
    expect(meter?.share(stateAt(SORTIE_SECONDS))).toBeCloseTo(
      batteryAt(SORTIE_SECONDS, 300).share,
      9,
    );
    expect(meter?.share(stateAt(SORTIE_SECONDS, 1500))).toBeLessThan(
      meter?.share(stateAt(SORTIE_SECONDS)) ?? 0,
    );
  });

  it('meters only the battery', () => {
    ['clock', 'speed', 'height', 'distance'].forEach((id) =>
      expect(readout(id).meter).toBeUndefined(),
    );
  });
});

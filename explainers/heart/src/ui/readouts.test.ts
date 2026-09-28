import { describe, expect, it } from 'vitest';
import { createHeartStore } from '../state';
import type { HeartStoreState } from '../state';
import { HEART_READOUTS } from './readouts';

function readout(id: string) {
  const found = HEART_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(phase: number): HeartStoreState {
  return createHeartStore({ phase }).getState();
}

describe('gauge readouts', () => {
  it('shows the two pressures, the volume, the valves and the signal in that order', () => {
    expect(HEART_READOUTS.map((row) => row.id)).toEqual([
      'lvPressure',
      'aorticPressure',
      'lvVolume',
      'valves',
      'signal',
    ]);
    expect(HEART_READOUTS.map((row) => row.numeric)).toEqual([true, true, true, false, false]);
  });

  it('tints the ventricle pressure while it is high enough to open the aortic valve', () => {
    const { tone } = readout('lvPressure');
    expect(tone?.(stateAt(340))).toBe('var(--eject)');
    expect(tone?.(stateAt(700))).toBe('var(--text)');
  });

  it('fills the pressure meters against 140 mmHg and the volume meter against 140 mL', () => {
    const peak = stateAt(340);
    expect(readout('lvPressure').meter?.share(peak)).toBeCloseTo(120 / 140, 1);
    expect(readout('aorticPressure').meter?.share(peak)).toBeCloseTo(120 / 140, 1);
    expect(readout('lvVolume').meter?.share(stateAt(200))).toBeCloseTo(120 / 140);
    expect(readout('lvVolume').meter?.fill).toBe('var(--fill)');
  });

  it('moves every meter with the moment in the beat', () => {
    ['lvPressure', 'aorticPressure', 'lvVolume'].forEach((id) => {
      const { meter } = readout(id);
      expect(meter?.share(stateAt(300)), id).not.toBeCloseTo(meter?.share(stateAt(650)) ?? 0, 2);
    });
  });
});

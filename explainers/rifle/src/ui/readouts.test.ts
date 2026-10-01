import { describe, expect, it } from 'vitest';
import { EXIT_MS, MOMENTS, REAR_MS, unitsAt } from '../model';
import { createRifleStore } from '../state';
import type { RifleStoreState } from '../state';
import { RIFLE_READOUTS } from './readouts';

function readout(id: string) {
  const found = RIFLE_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(ms: number, gasPort: 'open' | 'blocked' = 'open'): RifleStoreState {
  return createRifleStore({ phase: unitsAt(ms), gasPort }).getState();
}

describe('gauge readouts', () => {
  it('shows the time, the pressure, the bullet speed and the carrier', () => {
    expect(RIFLE_READOUTS.map((row) => row.id)).toEqual([
      'time',
      'pressure',
      'bulletSpeed',
      'carrier',
    ]);
    RIFLE_READOUTS.forEach((row) => expect(row.numeric, row.id).toBe(true));
    expect(readout('time').meter).toBeUndefined();
  });

  it('fills the pressure meter up to 300 MPa', () => {
    expect(readout('pressure').meter?.share(stateAt(0))).toBe(0);
    expect(readout('pressure').meter?.share(stateAt(MOMENTS.peak))).toBeCloseTo(275 / 300, 3);
  });

  it('fills the speed meter up to the muzzle speed', () => {
    expect(readout('bulletSpeed').meter?.share(stateAt(MOMENTS.start))).toBe(0);
    expect(readout('bulletSpeed').meter?.share(stateAt(EXIT_MS))).toBe(1);
  });

  it('fills the carrier meter with its stroke and leaves it empty with the port blocked', () => {
    expect(readout('carrier').meter?.share(stateAt(0))).toBe(0);
    expect(readout('carrier').meter?.share(stateAt(REAR_MS))).toBe(1);
    expect(readout('carrier').meter?.share(stateAt(REAR_MS, 'blocked'))).toBe(0);
  });
});

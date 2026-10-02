import { describe, expect, it } from 'vitest';
import { FUEL_KG, MISSION_UNITS, fuelAt } from '../model';
import { createReaperStore } from '../state';
import type { ReaperStoreState } from '../state';
import { THEME } from '../theme';
import { REAPER_READOUTS } from './readouts';

function readout(id: string) {
  const found = REAPER_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(phase: number, load: 'clean' | 'armed' = 'armed'): ReaperStoreState {
  return createReaperStore({ phase, load }).getState();
}

describe('gauge readouts', () => {
  it('shows the clock, the altitude, the airspeed and the fuel', () => {
    expect(REAPER_READOUTS.map((row) => row.id)).toEqual(['clock', 'altitude', 'airspeed', 'fuel']);
    REAPER_READOUTS.forEach((row) => expect(row.numeric, row.id).toBe(true));
    REAPER_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
  });

  it('fills the fuel meter with what is left in the tanks', () => {
    const { meter } = readout('fuel');
    expect(meter?.fill).toBe(THEME.fuel);
    expect(meter?.share(stateAt(0))).toBe(1);
    expect(meter?.share(stateAt(MISSION_UNITS))).toBeCloseTo(
      fuelAt(MISSION_UNITS, 'armed').kg / FUEL_KG,
      9,
    );
    expect(meter?.share(stateAt(MISSION_UNITS, 'clean'))).toBeGreaterThan(
      meter?.share(stateAt(MISSION_UNITS)) ?? 1,
    );
  });

  it('meters only the fuel', () => {
    ['clock', 'altitude', 'airspeed'].forEach((id) => expect(readout(id).meter).toBeUndefined());
  });
});

import { describe, expect, it } from 'vitest';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES, STIR_DEG_PER_S } from '../model';
import {
  acidMadeM,
  clockReading,
  createAssemblyState,
  iodideMadeM,
  switchSecondsOf,
  writeAssemblyState,
} from './derived';
import { createClockStore } from './store';

function stateAt(phase: number, changes = {}) {
  return { ...createClockStore({ playing: false }).getState(), phase, ...changes };
}

describe('derived clock state', () => {
  it('switches after 10 s for recipe A and later for less iodate or a colder beaker', () => {
    expect(switchSecondsOf({ iodateMm: 25, temperatureC: 20 })).toBe(10);
    expect(switchSecondsOf({ iodateMm: 12.5, temperatureC: 20 })).toBe(20);
    expect(switchSecondsOf({ iodateMm: 25, temperatureC: 0 })).toBeCloseTo(15, 9);
    expect(switchSecondsOf({ iodateMm: 50, temperatureC: 40 })).toBeCloseTo(3.33, 2);
    expect(switchSecondsOf({ iodateMm: 10, temperatureC: 5 })).toBeCloseTo(33.9, 1);
  });

  it('starts with all the bisulfite and no iodine or iodide', () => {
    const reading = clockReading(stateAt(0));
    expect(reading).toMatchObject({ seconds: 0, phase: 'pour', pour: 0, iodideM: 0, iodineM: 0 });
    expect(reading.bisulfiteM).toBeCloseTo(0.0125, 9);
    expect(reading.iodateM).toBeCloseTo(0.025, 9);
    expect(reading.lifetimeSeconds).toBeCloseTo(44e-9, 9);
    expect(reading.counts.bisulfite).toBe(9);
    expect(reading.counts.iodate).toBe(18);
  });

  it('has made 4.17 mM iodide and used a sixth of the iodate at the switch', () => {
    const reading = clockReading(stateAt(MOMENTS.switch));
    expect(reading.seconds).toBeCloseTo(10, 9);
    expect(reading.bisulfiteM).toBe(0);
    expect(reading.iodideM * 1000).toBeCloseTo(4.17, 2);
    expect(reading.iodateM * 1000).toBeCloseTo(20.83, 2);
    expect(reading.acidM * 1000).toBeCloseTo(12.5, 6);
    expect(reading.lifetimeSeconds).toBe(Infinity);
  });

  it('only ever grows the iodide and acid the slow step has made', () => {
    const recipes = [
      { iodateMm: 25, temperatureC: 20 },
      { iodateMm: 10, temperatureC: 5 },
      { iodateMm: 50, temperatureC: 40 },
    ];
    recipes.forEach((recipe) => {
      let iodide = 0;
      let acid = 0;
      for (let phase = 0; phase <= CYCLE_UNITS; phase += 1) {
        const reading = clockReading(stateAt(phase, recipe));
        expect(iodideMadeM(reading)).toBeGreaterThanOrEqual(iodide);
        expect(acidMadeM(reading)).toBeGreaterThanOrEqual(acid);
        iodide = iodideMadeM(reading);
        acid = acidMadeM(reading);
      }
      expect(iodide * 1000).toBeCloseTo(4.17, 2);
      expect(acid * 1000).toBeCloseTo(12.5, 6);
    });
  });

  it('ends with 2.5 mM iodine, full colour and 7.5 mM acid', () => {
    const reading = clockReading(stateAt(CYCLE_UNITS));
    expect(reading.seconds).toBeCloseTo(15, 9);
    expect(reading.iodineM * 1000).toBeCloseTo(2.5, 6);
    expect(reading.acidM * 1000).toBeCloseTo(7.5, 6);
    expect(reading.colour).toBeCloseTo(1, 6);
    expect(reading.complex).toBe(1);
    expect(reading.stirDeg).toBeCloseTo(15 * STIR_DEG_PER_S, 9);
  });

  it('shows colour from about 20 µM iodine, just after the switch', () => {
    expect(clockReading(stateAt(MOMENTS.visible - 1)).colour).toBe(0);
    expect(clockReading(stateAt(MOMENTS.visible + 1)).colour).toBeGreaterThan(0);
  });

  it('finishes the pour at the end of its phase', () => {
    expect(clockReading(stateAt(PHASE_RANGES.pour.end)).pour).toBe(1);
  });

  it('reuses the reading for the same phase and recipe', () => {
    const first = clockReading(stateAt(300));
    expect(clockReading(stateAt(300))).toBe(first);
    expect(clockReading(stateAt(300, { iodateMm: 30 }))).not.toBe(first);
  });

  it('writes the assembly state in place, with both reaction events', () => {
    const target = createAssemblyState(stateAt(300));
    const counts = target.clock.counts;
    const written = writeAssemblyState(target, stateAt(900, { scale: 'molecules' }));
    expect(written).toBe(target);
    expect(written.clock.counts).toBe(counts);
    expect(written).toMatchObject({ scale: 'molecules', phase: 900, playing: false });
    expect(written.landolt.active).toBe(false);
    expect(written.iodineEvent).toMatchObject({ active: false, stage: 'meet', progress: 0 });
    writeAssemblyState(target, stateAt(300));
    expect(target.landolt.active).toBe(true);
    expect(target.iodineEvent.active).toBe(true);
  });
});

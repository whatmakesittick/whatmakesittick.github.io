import { beforeAll, describe, expect, it } from 'vitest';
import { CYCLE_UNITS, MOMENTS } from '../model';
import { createClockStore } from '../state';
import { PHASE_TONES, THEME } from '../theme';
import { CLOCK_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts, timeline } = TEST_LOCALE;

function row(id: string) {
  const found = CLOCK_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function at(phase: number) {
  return createClockStore({ phase, playing: false }).getState();
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the clock, the bisulfite, the iodine and what happens now', () => {
    expect(CLOCK_READOUTS.map((readout) => readout.id)).toEqual([
      'clock',
      'bisulfite',
      'iodine',
      'now',
    ]);
    CLOCK_READOUTS.forEach((readout) => expect(readout.labelKey).toBe(`readouts.${readout.id}`));
    expect(row('now').numeric).toBe(false);
    expect(row('bisulfite').meter?.fill).toBe(THEME.sulfur);
    expect(row('iodine').meter?.fill).toBe(THEME.blueBlack);
  });

  it('starts full of bisulfite with every iodine eaten', () => {
    const start = at(0);
    expect(row('clock').value(start)).toBe(fill(timeline.value, { seconds: '0.0' }));
    expect(row('bisulfite').value(start)).toBe(fill(units.millimolar, { value: '12.50' }));
    expect(row('bisulfite').meter?.share(start)).toBeCloseTo(1, 9);
    expect(row('iodine').value(start)).toBe(readouts.iodineState.eaten);
    expect(row('iodine').meter?.share(start)).toBe(0);
    expect(row('now').value(start)).toBe(timeline.detail.pour);
    expect(row('now').tone?.(start)).toBe(PHASE_TONES.pour);
  });

  it('ends with no bisulfite and the full blue-black colour', () => {
    const end = at(CYCLE_UNITS);
    expect(row('bisulfite').value(end)).toBe(fill(units.millimolar, { value: '0.00' }));
    expect(row('bisulfite').meter?.share(end)).toBe(0);
    expect(row('iodine').value(end)).toBe(fill(units.millimolar, { value: '2.50' }));
    expect(row('iodine').meter?.share(end)).toBeCloseTo(1, 6);
    expect(row('now').value(end)).toBe(timeline.detail.blue);
  });

  it('keeps iodine eaten at the switch instant, then shows it in µM', () => {
    const switched = at(MOMENTS.switch);
    expect(row('clock').value(switched)).toBe(fill(timeline.value, { seconds: '10.000' }));
    expect(row('iodine').value(switched)).toBe(readouts.iodineState.eaten);
    expect(row('iodine').value(at(MOMENTS.visible))).toBe(fill(units.micromolar, { value: '20' }));
  });
});

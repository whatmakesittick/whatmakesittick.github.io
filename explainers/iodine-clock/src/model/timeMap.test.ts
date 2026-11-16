import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  CYCLE_UNITS,
  MOMENTS,
  PHASE_RANGES,
  VISIBLE_DELAY_S,
  advanceUnits,
  complexShare,
  paceAt,
  phaseIdAt,
  phaseProgress,
  realAt,
  realBounds,
  runEndSeconds,
  screenSeconds,
  unitsAt,
} from './timeMap';

const SWITCHES = [3.33, 5, 10, 20, 33.9];
const UNITS = Array.from({ length: 101 }, (_, index) => index * 10);

describe('time map', () => {
  it('tiles the run with the phases in order', () => {
    expect(PHASE_RANGES.pour.start).toBe(0);
    expect(PHASE_RANGES.blue.end).toBe(CYCLE_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('maps the phase borders to the table at the defaults', () => {
    const borders = PHASE_IDS.map((id) => realAt(PHASE_RANGES[id].start, 10));
    [0, 1, 9, 10, 10.02, 10.4].forEach((seconds, index) =>
      expect(borders[index]).toBeCloseTo(seconds, 9),
    );
    expect(realAt(CYCLE_UNITS, 10)).toBeCloseTo(runEndSeconds(10), 9);
    expect(runEndSeconds(10)).toBe(15);
  });

  it('round-trips real seconds and units for every switch time', () => {
    SWITCHES.forEach((switchAt) =>
      UNITS.forEach((units) =>
        expect(unitsAt(realAt(units, switchAt), switchAt)).toBeCloseTo(units, 6),
      ),
    );
  });

  it('is monotonic in both directions', () => {
    SWITCHES.forEach((switchAt) => {
      const seconds = UNITS.map((units) => realAt(units, switchAt));
      seconds.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(seconds[index]));
      const back = seconds.map((value) => unitsAt(value, switchAt));
      back.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(back[index]));
    });
  });

  it('clamps seconds outside the run', () => {
    expect(unitsAt(-1, 10)).toBe(0);
    expect(unitsAt(100, 10)).toBe(CYCLE_UNITS);
  });

  it('names the phase and the progress inside it', () => {
    expect(phaseIdAt(0)).toBe('pour');
    expect(phaseIdAt(680)).toBe('iodine');
    expect(phaseIdAt(CYCLE_UNITS)).toBe('blue');
    expect(phaseProgress(730)).toBeCloseTo(0.5, 9);
  });

  it('stretches the iodine and complex phases to 1.5 screen seconds', () => {
    expect(screenSeconds('iodine', 10)).toBe(1.5);
    expect(screenSeconds('complex', 10)).toBe(1.5);
    expect(screenSeconds('induction', 10)).toBeCloseTo(8, 9);
    expect(paceAt(100, 10)).toBeCloseTo(1, 9);
    expect(paceAt(700, 10)).toBeCloseTo(0.0133, 4);
    expect(paceAt(800, 10)).toBeCloseTo(0.253, 3);
  });

  it('advances across phase borders at each phase pace and stops at the end', () => {
    expect(advanceUnits(0, 0.5, 10)).toBeCloseTo(30, 9);
    expect(advanceUnits(0, 1 + 4, 10)).toBeCloseTo(60 + 230, 9);
    expect(advanceUnits(670, 0.0625 + 0.75, 10)).toBeCloseTo(730, 9);
    expect(advanceUnits(0, 10 + 1.5 + 1.5 + 4.6, 10)).toBeCloseTo(CYCLE_UNITS, 6);
    expect(advanceUnits(990, 100, 10)).toBe(CYCLE_UNITS);
    expect(advanceUnits(CYCLE_UNITS, 1, 10)).toBe(CYCLE_UNITS);
  });

  it('plays the run in its total screen time', () => {
    const total = PHASE_IDS.reduce((sum, id) => sum + screenSeconds(id, 10), 0);
    expect(advanceUnits(0, total - 1e-6, 10)).toBeLessThan(CYCLE_UNITS);
    expect(advanceUnits(0, total + 1e-6, 10)).toBe(CYCLE_UNITS);
  });

  it('builds the starch complex across its phase', () => {
    expect(complexShare(PHASE_RANGES.complex.start)).toBe(0);
    expect(complexShare(830)).toBeCloseTo(0.5, 9);
    expect(complexShare(PHASE_RANGES.blue.start)).toBe(1);
  });

  it('places the moments, with the colour visible 0.8 ms after the switch', () => {
    expect(MOMENTS.mixed).toBe(60);
    expect(MOMENTS.switch).toBe(680);
    expect(MOMENTS.deepBlue).toBe(880);
    expect(VISIBLE_DELAY_S * 1000).toBeCloseTo(0.8, 2);
    SWITCHES.forEach((switchAt) =>
      expect(MOMENTS.visible).toBeCloseTo(unitsAt(switchAt + VISIBLE_DELAY_S, switchAt), 9),
    );
    expect(MOMENTS.visible).toBeCloseTo(684, 0);
  });

  it('keeps the induction phase at least one second long', () => {
    const { induction } = realBounds(3);
    expect(induction.end - induction.start).toBeGreaterThanOrEqual(1);
  });
});

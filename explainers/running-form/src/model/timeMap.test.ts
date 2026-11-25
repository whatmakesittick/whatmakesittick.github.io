import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PACE_IDS, PHASE_IDS } from '../ids';
import { MOMENTS, PHASE_RANGES, momentAt, phaseAt, phaseBounds } from './timeMap';
import {
  CYCLE_UNITS,
  REAL_TIME_SPEED,
  SPEED_RANGE,
  paceRate,
  speedFactor,
  unitsDelta,
  wrapUnits,
} from './playback';
import { strideTimeS } from './paces';

const BOUNDS = {
  easy: [0, 200, 405, 700, 1000],
  steady: [0, 180, 363, 680, 1000],
  fast: [0, 170, 340, 670, 1000],
} as const;

describe('time map', () => {
  it('pins the phase bounds of every pace', () => {
    PACE_IDS.forEach((pace) => {
      const bounds = phaseBounds(pace);
      const expected = BOUNDS[pace];
      PHASE_IDS.forEach((phase, index) => {
        expect(bounds[phase]).toEqual([expected[index], expected[index + 1]]);
      });
    });
  });

  it('uses the steady bounds as the nominal bands', () => {
    expect(PHASE_RANGES.landing).toEqual({ start: 0, end: 180 });
    expect(PHASE_RANGES.pushOff).toEqual({ start: 180, end: 363 });
    expect(PHASE_RANGES.recovery).toEqual({ start: 363, end: 680 });
    expect(PHASE_RANGES.reach).toEqual({ start: 680, end: 1000 });
  });

  it('finds the phase at a position', () => {
    expect(phaseAt(0, 'steady')).toBe('landing');
    expect(phaseAt(179, 'steady')).toBe('landing');
    expect(phaseAt(180, 'steady')).toBe('pushOff');
    expect(phaseAt(363, 'steady')).toBe('recovery');
    expect(phaseAt(680, 'steady')).toBe('reach');
    expect(phaseAt(1000, 'steady')).toBe('landing');
  });

  it('places the moments of the steady pace', () => {
    expect(MOMENTS).toEqual({
      touchdown: 0,
      peakForce: 150,
      midStance: 180,
      toeOff: 363,
      midFloat: 431,
      leftTouchdown: 500,
      midSwing: 680,
    });
    MOMENT_IDS.forEach((id) => expect(MOMENTS[id]).toBeLessThan(CYCLE_UNITS));
    expect(momentAt('easy', 'midStance')).toBe(200);
    expect(momentAt('fast', 'toeOff')).toBe(340);
  });

  it('keeps the middle of float one in a float at every pace', () => {
    PACE_IDS.forEach((pace) => {
      const midFloat = momentAt(pace, 'midFloat');
      expect(midFloat).toBeGreaterThan(momentAt(pace, 'toeOff'));
      expect(midFloat).toBeLessThan(500);
    });
  });
});

describe('playback', () => {
  it('wraps units and takes the shortest signed difference', () => {
    expect(wrapUnits(-10)).toBe(990);
    expect(wrapUnits(1010)).toBe(10);
    expect(unitsDelta(990, 10)).toBe(20);
    expect(unitsDelta(10, 990)).toBe(-20);
    expect(unitsDelta(0, 500)).toBe(500);
  });

  it('halves the speed with each step down from real time', () => {
    expect(speedFactor(REAL_TIME_SPEED)).toBe(1);
    expect(speedFactor(SPEED_RANGE.default)).toBe(0.25);
    expect(speedFactor(0)).toBe(1 / 16);
  });

  it('runs one cycle in the stride time at real time', () => {
    PACE_IDS.forEach((pace) => {
      expect(CYCLE_UNITS / paceRate(pace, 0, REAL_TIME_SPEED)).toBeCloseTo(strideTimeS(pace, 0), 9);
    });
    expect(paceRate('steady', 10, REAL_TIME_SPEED)).toBeGreaterThan(
      paceRate('steady', 0, REAL_TIME_SPEED),
    );
  });
});

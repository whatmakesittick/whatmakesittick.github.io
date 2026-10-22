import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PHASE_IDS, TOP_SPEED_IDS } from '../ids';
import { ACCEL_LOW, GAP_MM, LINE_M } from './constants';
import { LIFT_TRAVEL_MM, REST_GAP_MM } from './layout';
import {
  BASE_RIDE_SECONDS,
  DEFAULT_SPEED,
  MOMENTS,
  PHASE_RANGES,
  PROFILES,
  RUN_UNITS,
  SLOW_SPEED,
  SPEED_RANGE,
  TOP_SPEED_KMH,
  distanceAtTime,
  gapAt,
  motionAt,
  phaseAt,
  rate,
  realSecondsAt,
  speedAtTime,
  tripSeconds,
  unitsAt,
} from './motion';
import { toMs } from './scale';

const BOUNDARY_STEP = 1e-6;
const SPEED_JUMP_MS = 1e-3;
const DISTANCE_JUMP_M = 1e-2;
const UNIT_STEP = 5;
const SECONDS_PER_MINUTE = 60;

function unitsAcross(from: number, to: number, step = UNIT_STEP): number[] {
  return Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, index) => from + index * step,
  );
}

function minutesAndSeconds(seconds: number): string {
  const whole = Math.round(seconds);
  const rest = String(whole % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${Math.floor(whole / SECONDS_PER_MINUTE)}:${rest}`;
}

describe('motion', () => {
  it('splits the run into five touching bands of fixed run units', () => {
    expect(PHASE_RANGES.liftOff.start).toBe(0);
    expect(PHASE_RANGES.settle.end).toBe(RUN_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
    expect(PHASE_IDS.map((id) => PHASE_RANGES[id].end)).toEqual([60, 420, 600, 940, 1000]);
  });

  it('reads the stage at the band edges and clamps outside the run', () => {
    expect(phaseAt(-10)).toBe('liftOff');
    expect(phaseAt(0)).toBe('liftOff');
    expect(phaseAt(60 - BOUNDARY_STEP)).toBe('liftOff');
    expect(phaseAt(60)).toBe('accelerate');
    expect(phaseAt(420)).toBe('cruise');
    expect(phaseAt(600)).toBe('brake');
    expect(phaseAt(940 - BOUNDARY_STEP)).toBe('brake');
    expect(phaseAt(940)).toBe('settle');
    expect(phaseAt(RUN_UNITS)).toBe('settle');
    expect(phaseAt(RUN_UNITS + 10)).toBe('settle');
  });

  it('marks the four moments in order at fixed units', () => {
    expect(MOMENTS).toEqual({ lifted: 45, fullSpeed: 420, brakeStart: 600, touchdown: 970 });
    MOMENT_IDS.slice(1).forEach((id, index) =>
      expect(MOMENTS[id]).toBeGreaterThan(MOMENTS[MOMENT_IDS[index]]),
    );
  });

  it('plays the whole ride in a minute at the default pace', () => {
    expect(rate(DEFAULT_SPEED) * SECONDS_PER_MINUTE).toBeCloseTo(RUN_UNITS, 9);
    expect(SPEED_RANGE).toEqual({ min: 1, max: 32, step: 1, default: DEFAULT_SPEED });
    expect(DEFAULT_SPEED).toBe(8);
    expect(SLOW_SPEED).toBe(2);
    expect(BASE_RIDE_SECONDS / DEFAULT_SPEED).toBe(SECONDS_PER_MINUTE);
  });

  it('reaches 430 km/h in two stages, cruises half a minute and brakes for three', () => {
    const profile = PROFILES.kmh430;
    expect(TOP_SPEED_KMH.kmh430).toBe(430);
    expect(profile.topMs).toBeCloseTo(toMs(430), 9);
    expect(profile.accelSeconds).toBeCloseTo(223.2, 1);
    expect(profile.accelMetres).toBeCloseTo(15461, -1);
    expect(profile.cruiseSeconds).toBeCloseTo(29.8, 1);
    expect(profile.cruiseMetres).toBeCloseTo(3565, -1);
    expect(profile.brakeSeconds).toBeCloseTo(183.8, 1);
    expect(profile.brakeMetres).toBeCloseTo(10975, 0);
    expect(profile.tripSeconds).toBeCloseTo(448.8, 1);
    expect(profile.accelMetres + profile.cruiseMetres + profile.brakeMetres).toBeCloseTo(LINE_M, 6);
  });

  it('skips the second stage at 300 km/h and cruises for almost four minutes', () => {
    const profile = PROFILES.kmh300;
    expect(profile.accelSeconds).toBeCloseTo(120, 6);
    expect(profile.accelMetres).toBeCloseTo(5000, 6);
    expect(profile.cruiseSeconds).toBeCloseTo(235.9, 1);
    expect(profile.brakeSeconds).toBeCloseTo(128.2, 1);
    expect(profile.brakeMetres).toBeCloseTo(5342, 0);
    expect(profile.tripSeconds).toBeCloseTo(496.1, 1);
    expect(tripSeconds('kmh300')).toBe(profile.tripSeconds);
  });

  it('matches the rounded times the copy quotes', () => {
    const stages = (id: 'kmh430' | 'kmh300') => {
      const { accelSeconds, cruiseSeconds, brakeSeconds } = PROFILES[id];
      return [accelSeconds, cruiseSeconds, brakeSeconds, tripSeconds(id)].map(minutesAndSeconds);
    };
    expect(stages('kmh430')).toEqual(['3:43', '0:30', '3:04', '7:29']);
    expect(stages('kmh300')).toEqual(['2:00', '3:56', '2:08', '8:16']);
  });

  it('maps run units to real seconds through the stage knots', () => {
    expect(realSecondsAt(0, 'kmh430')).toBe(0);
    expect(realSecondsAt(60, 'kmh430')).toBeCloseTo(6, 9);
    expect(realSecondsAt(420, 'kmh430')).toBeCloseTo(229.2, 1);
    expect(realSecondsAt(600, 'kmh430')).toBeCloseTo(259.0, 1);
    expect(realSecondsAt(940, 'kmh430')).toBeCloseTo(442.8, 1);
    expect(realSecondsAt(RUN_UNITS, 'kmh430')).toBeCloseTo(tripSeconds('kmh430'), 9);
    expect(realSecondsAt(420, 'kmh300')).toBeCloseTo(126.0, 1);
    expect(realSecondsAt(600, 'kmh300')).toBeCloseTo(361.9, 1);
    expect(realSecondsAt(940, 'kmh300')).toBeCloseTo(490.1, 1);
    expect(realSecondsAt(30, 'kmh430')).toBeCloseTo(3, 9);
  });

  it('turns real seconds back into the same run units and clamps outside the run', () => {
    TOP_SPEED_IDS.forEach((topSpeed) => {
      unitsAcross(0, RUN_UNITS, 7).forEach((units) =>
        expect(
          unitsAt(realSecondsAt(units, topSpeed), topSpeed),
          `${topSpeed} ${units}`,
        ).toBeCloseTo(units, 9),
      );
      expect(unitsAt(-5, topSpeed)).toBe(0);
      expect(unitsAt(tripSeconds(topSpeed) + 60, topSpeed)).toBe(RUN_UNITS);
      expect(realSecondsAt(RUN_UNITS + 50, topSpeed)).toBeCloseTo(tripSeconds(topSpeed), 9);
    });
  });

  it('speeds up in two stages, holds top speed, then brakes to a stop at the airport', () => {
    expect(speedAtTime(-1, 'kmh430')).toBe(0);
    expect(speedAtTime(60, 'kmh430')).toBeCloseTo(ACCEL_LOW * 60, 9);
    expect(speedAtTime(120, 'kmh430')).toBeCloseTo(toMs(300), 2);
    const { accelSeconds, accelMetres, cruiseSeconds, brakeSeconds, topMs } = PROFILES.kmh430;
    expect(speedAtTime(accelSeconds, 'kmh430')).toBeCloseTo(topMs, 9);
    expect(distanceAtTime(accelSeconds, 'kmh430')).toBeCloseTo(accelMetres, 6);
    expect(speedAtTime(accelSeconds + cruiseSeconds + brakeSeconds / 2, 'kmh430')).toBeCloseTo(
      topMs / 2,
      9,
    );
    expect(speedAtTime(10000, 'kmh430')).toBe(0);
    expect(distanceAtTime(-1, 'kmh430')).toBe(0);
    expect(distanceAtTime(10000, 'kmh430')).toBe(LINE_M);
    expect(speedAtTime(200, 'kmh300')).toBeCloseTo(toMs(300), 9);
  });

  it('holds top speed through the whole cruise band', () => {
    TOP_SPEED_IDS.forEach((topSpeed) =>
      unitsAcross(420, 600).forEach((units) =>
        expect(motionAt(units, topSpeed, 'regen').speedMs, `${topSpeed} ${units}`).toBeCloseTo(
          PROFILES[topSpeed].topMs,
          9,
        ),
      ),
    );
  });

  it('stands at the start in lift-off and reaches 30 km at the end of braking', () => {
    TOP_SPEED_IDS.forEach((topSpeed) => {
      const start = motionAt(30, topSpeed, 'regen');
      expect(start.distance).toBe(0);
      expect(start.speedMs).toBe(0);
      expect(motionAt(940, topSpeed, 'regen').distance).toBe(LINE_M);
      expect(motionAt(940 - BOUNDARY_STEP, topSpeed, 'regen').distance).toBeCloseTo(LINE_M, 3);
      expect(motionAt(RUN_UNITS, topSpeed, 'regen').speedMs).toBe(0);
    });
  });

  it('moves forward only and never jumps at a band edge', () => {
    TOP_SPEED_IDS.forEach((topSpeed) => {
      const distances = unitsAcross(0, RUN_UNITS, 1).map(
        (units) => motionAt(units, topSpeed, 'regen').distance,
      );
      distances
        .slice(1)
        .forEach((distance, index) => expect(distance).toBeGreaterThanOrEqual(distances[index]));
      PHASE_IDS.slice(1).forEach((id) => {
        const edge = PHASE_RANGES[id].start;
        const before = motionAt(edge - BOUNDARY_STEP, topSpeed, 'regen');
        const after = motionAt(edge, topSpeed, 'regen');
        expect(Math.abs(after.speedMs - before.speedMs), `${topSpeed} ${id}`).toBeLessThan(
          SPEED_JUMP_MS,
        );
        expect(Math.abs(after.distance - before.distance), `${topSpeed} ${id}`).toBeLessThan(
          DISTANCE_JUMP_M,
        );
      });
    });
  });

  it('lifts off the skids to a 10 mm gap and sets down again at the airport', () => {
    expect(gapAt(0, 'kmh430', 'regen')).toBe(REST_GAP_MM);
    expect(gapAt(10, 'kmh430', 'regen')).toBe(REST_GAP_MM);
    expect(gapAt(27.5, 'kmh430', 'regen')).toBeCloseTo((REST_GAP_MM + GAP_MM) / 2, 9);
    expect(gapAt(45, 'kmh430', 'regen')).toBe(GAP_MM);
    expect(gapAt(500, 'kmh430', 'regen')).toBe(GAP_MM);
    expect(gapAt(950, 'kmh430', 'regen')).toBe(GAP_MM);
    expect(gapAt(970, 'kmh430', 'regen')).toBe(REST_GAP_MM);
    expect(gapAt(RUN_UNITS, 'kmh300', 'regen')).toBe(REST_GAP_MM);
  });

  it('reads the lift and the skids from the gap', () => {
    const resting = motionAt(5, 'kmh430', 'regen');
    expect(resting).toMatchObject({ liftMm: 0, onSkids: true, sliding: false });
    const floating = motionAt(300, 'kmh430', 'regen');
    expect(floating).toMatchObject({ liftMm: LIFT_TRAVEL_MM, onSkids: false, sliding: false });
    expect(floating.phase).toBe('accelerate');
    expect(floating.speedKmh).toBeCloseTo(floating.speedMs * 3.6, 9);
    expect(motionAt(985, 'kmh430', 'regen')).toMatchObject({ onSkids: true, sliding: false });
  });

  it('drops onto the skids below 10 km/h with the eddy brake and slides to the stop', () => {
    TOP_SPEED_IDS.forEach((topSpeed) => {
      expect(motionAt(900, topSpeed, 'eddy').gapMm).toBe(GAP_MM);
      const eddy = motionAt(939, topSpeed, 'eddy');
      expect(eddy.speedKmh).toBeGreaterThan(0);
      expect(eddy.speedKmh).toBeLessThan(8);
      expect(eddy).toMatchObject({ gapMm: REST_GAP_MM, onSkids: true, sliding: true });
      const regen = motionAt(939, topSpeed, 'regen');
      expect(regen).toMatchObject({ gapMm: GAP_MM, onSkids: false, sliding: false });
      expect(motionAt(950, topSpeed, 'eddy')).toMatchObject({ onSkids: true, sliding: false });
      expect(motionAt(939, topSpeed, 'eddy').distance).toBe(regen.distance);
    });
  });
});

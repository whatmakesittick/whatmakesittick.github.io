import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { CORNER_NOZZLE_IDS, MOMENT_IDS, PHASE_IDS, REAR_NOZZLE_IDS } from '../ids';
import type { CarReading } from '../ids';
import { CORNER_NOZZLE_MAX_N, LANDING_SQUAT_M } from './constants';
import { CAR, RAMP } from './layout';
import {
  CATCH_THRUST_N,
  MOMENTS,
  PHASE_RANGES,
  RUN_SECONDS,
  TOUCHDOWN_SPEED_MS,
  carAt,
  fansAt,
  nozzlesAt,
  phaseAt,
  runAt,
} from './run';

interface Row {
  t: number;
  x: number;
  speed: number;
  height: number;
  roll: number;
}

const MOTION_TABLE: readonly Row[] = [
  { t: 1, x: 2.7, speed: 5.3, height: 0, roll: 0 },
  { t: 2, x: 10.7, speed: 10.7, height: 0, roll: 0 },
  { t: 3, x: 24, speed: 16, height: 0, roll: 0 },
  { t: 3.9, x: 36, speed: 13.3, height: 4, roll: 180 },
  { t: 4, x: 37, speed: 12.7, height: 4.84, roll: 180 },
  { t: 4.81, x: 45, speed: 9.9, height: 8.05, roll: 244 },
  { t: 5, x: 46.9, speed: 10.1, height: 7.9, roll: 288 },
  { t: 5.65, x: 53.3, speed: 12.9, height: 4.6, roll: 360 },
  { t: 6, x: 56.8, speed: 11.5, height: 2.1, roll: 360 },
  { t: 6.5, x: 61.7, speed: 10.2, height: 0, roll: 360 },
  { t: 8, x: 74.3, speed: 6.9, height: 0, roll: 360 },
  { t: 11.45, x: 86.2, speed: 0, height: 0, roll: 360 },
];

const SHARE_TOLERANCE = 0.03;
const ABSOLUTE_TOLERANCE = 0.15;
const ROLL_TOLERANCE_DEG = 3;
const BOUNDARY_STEP = 1e-6;
const JUMP_TOLERANCE = 1e-3;

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= Math.max(ABSOLUTE_TOLERANCE, SHARE_TOLERANCE * expected);
}

function track(car: CarReading): number[] {
  return [...car.position, car.speed, car.height, car.roll, car.pitch];
}

describe('run', () => {
  it('covers the 14 s run with six touching phases', () => {
    expect(PHASE_RANGES.boost.start).toBe(0);
    expect(PHASE_RANGES.rest.end).toBe(RUN_SECONDS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBeCloseTo(PHASE_RANGES[PHASE_IDS[index]].end, 9),
    );
    expect(PHASE_RANGES.flip.end).toBeCloseTo(5.65, 9);
    expect(PHASE_RANGES.catch.end).toBeCloseTo(6.5, 9);
    expect(phaseAt(0)).toBe('boost');
    expect(phaseAt(3.5)).toBe('ramp');
    expect(phaseAt(RUN_SECONDS)).toBe('rest');
  });

  it('marks the moments of the run in order', () => {
    expect(MOMENTS.leavesRamp).toBeCloseTo(3.9, 9);
    expect(MOMENTS.peak).toBeCloseTo(4.81, 2);
    expect(MOMENTS.rollComplete).toBeCloseTo(5.65, 9);
    expect(MOMENTS.touchdown).toBeCloseTo(6.5, 9);
    expect(MOMENTS.stopped).toBeCloseTo(11.45, 2);
    MOMENT_IDS.slice(1).forEach((id, index) =>
      expect(MOMENTS[id]).toBeGreaterThan(MOMENTS[MOMENT_IDS[index]]),
    );
  });

  it('follows the motion table', () => {
    MOTION_TABLE.forEach((row) => {
      const car = carAt(row.t);
      expect(near(car.position[0], row.x), `x at ${row.t}`).toBe(true);
      expect(near(car.speed, row.speed), `speed at ${row.t}`).toBe(true);
      expect(near(car.height, row.height), `height at ${row.t}`).toBe(true);
      expect(Math.abs(toDegrees(car.roll) - row.roll)).toBeLessThan(ROLL_TOLERANCE_DEG);
    });
  });

  it('peaks at 8.05 m and lands at about 2.5 m/s down', () => {
    expect(carAt(MOMENTS.peak).height).toBeCloseTo(8.05, 2);
    expect(TOUCHDOWN_SPEED_MS).toBeCloseTo(2.5, 0);
    expect(carAt(MOMENTS.touchdown).position[1]).toBeCloseTo(0, 9);
  });

  it('never jumps at a phase boundary', () => {
    PHASE_IDS.slice(1).forEach((id) => {
      const boundary = PHASE_RANGES[id].start;
      const before = track(carAt(boundary - BOUNDARY_STEP));
      const after = track(carAt(boundary + BOUNDARY_STEP));
      before.forEach((value, index) =>
        expect(Math.abs(after[index] - value), `${id} channel ${index}`).toBeLessThan(
          JUMP_TOLERANCE,
        ),
      );
    });
  });

  it('reads the same at any second whichever way the scrubber moves', () => {
    const forward = [2, 4.5, 6.2, 9].map((t) => track(carAt(t)));
    const backward = [9, 6.2, 4.5, 2].map((t) => track(carAt(t))).reverse();
    expect(backward).toEqual(forward);
    expect(track(carAt(-1))).toEqual(track(carAt(0)));
    expect(track(carAt(RUN_SECONDS + 1))).toEqual(track(carAt(RUN_SECONDS)));
  });

  it('flags the car on the ground, on the ramp and in the air', () => {
    expect(carAt(1).onGround).toBe(true);
    expect(carAt(3.5).onRamp).toBe(true);
    expect(carAt(5).airborne).toBe(true);
    expect(carAt(8).onGround).toBe(true);
  });

  it('rolls right side down on the ramp, inverted at the exit, upright after the flip', () => {
    expect(carAt(3.5).roll).toBeGreaterThan(0);
    expect(carAt(MOMENTS.leavesRamp).roll).toBeCloseTo(Math.PI, 6);
    expect(carAt(MOMENTS.rollComplete).roll).toBeCloseTo(2 * Math.PI, 9);
    expect(toDegrees(carAt(MOMENTS.leavesRamp).pitch)).toBeCloseTo(RAMP.exitAngleDeg, 1);
    expect(carAt(MOMENTS.rollComplete).pitch).toBe(0);
  });

  it('squats the suspension on landing without touching the body down', () => {
    const depths = Array.from(
      { length: 50 },
      (_, step) => carAt(MOMENTS.touchdown + step * 0.01).position[1],
    );
    expect(Math.min(...depths)).toBeCloseTo(-LANDING_SQUAT_M, 3);
    expect(Math.min(...depths)).toBeGreaterThan(-CAR.rideHeight);
    expect(carAt(MOMENTS.touchdown + 0.5).height).toBe(0);
  });

  it('fires the nozzles as the table says', () => {
    REAR_NOZZLE_IDS.forEach((id) => expect(nozzlesAt(1)[id]).toBeCloseTo(2267, 0));
    expect(Object.values(nozzlesAt(3.5)).every((thrust) => thrust === 0)).toBe(true);
    expect(nozzlesAt(4.5).cornerFrontLeft).toBe(2000);
    expect(nozzlesAt(4.5).cornerFrontRight).toBe(0);
    expect(nozzlesAt(5.2).cornerRearRight).toBe(2000);
    expect(nozzlesAt(5.2).cornerRearLeft).toBe(0);
    CORNER_NOZZLE_IDS.forEach((id) => expect(nozzlesAt(6).cornerFrontLeft).toBe(nozzlesAt(6)[id]));
    expect(nozzlesAt(6).cornerFrontLeft).toBeCloseTo(7024, -1);
    expect(Object.values(nozzlesAt(8)).every((thrust) => thrust === 0)).toBe(true);
  });

  it('catches the fall with about 28.1 kN, under the four corner nozzle ratings', () => {
    expect(CATCH_THRUST_N / 1000).toBeCloseTo(28.1, 1);
    expect(CATCH_THRUST_N).toBeLessThan(CORNER_NOZZLE_IDS.length * CORNER_NOZZLE_MAX_N);
  });

  it('turns the fans on along the ramp only', () => {
    expect(fansAt(2.9)).toBe(false);
    expect(fansAt(3.5)).toBe(true);
    expect(fansAt(4)).toBe(false);
    expect(runAt(3.5)).toEqual({
      phase: 'ramp',
      car: carAt(3.5),
      nozzles: nozzlesAt(3.5),
      fans: true,
    });
  });
});

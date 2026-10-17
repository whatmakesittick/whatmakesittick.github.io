import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { CORNER_NOZZLE_IDS, MOMENT_IDS, PHASE_IDS, REAR_NOZZLE_IDS } from '../ids';
import type { CarReading } from '../ids';
import {
  CORNER_NOZZLE_MAX_N,
  ENTRY_SPEED_MS,
  LANDING_SQUAT_M,
  ROLL_NOZZLE_N,
  RUN_UP_SPEED_MS,
  SIXTY_MPH_MS,
  TOUCHDOWN_SPEED_MS,
} from './constants';
import { CAR, DECK_END_X, JUMP, RAMP, SITE } from './layout';
import {
  CATCH_SECONDS,
  CATCH_THRUST_N,
  EXIT_SPEED_MS,
  LANDING_SECONDS,
  LEAP_THRUST_N,
  MOMENTS,
  PHASE_RANGES,
  RUN_SECONDS,
  carAt,
  catchFallAt,
  fansAt,
  landingFallAt,
  nozzlesAt,
  phaseAt,
  runAt,
} from './run';

const BOUNDARY_STEP = 1e-6;
const JUMP_TOLERANCE = 1e-3;
const POSITION_TOLERANCE_M = 0.5;

function track(car: CarReading): number[] {
  return [...car.position, car.speed, car.height, car.roll, car.pitch];
}

function within([from, to]: readonly [number, number], value: number): boolean {
  return value > from && value < to;
}

function firing(seconds: number): Record<string, number> {
  return Object.fromEntries(Object.entries(nozzlesAt(seconds)).filter(([, thrust]) => thrust > 0));
}

describe('run', () => {
  it('covers the 17 s run with ten touching phases', () => {
    expect(PHASE_RANGES.sprint.start).toBe(0);
    expect(PHASE_RANGES.rest.end).toBe(RUN_SECONDS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
    PHASE_IDS.forEach((id) => expect(phaseAt(PHASE_RANGES[id].start + BOUNDARY_STEP)).toBe(id));
    expect(phaseAt(RUN_SECONDS)).toBe('rest');
  });

  it('marks the ten moments in order inside the run', () => {
    MOMENT_IDS.slice(1).forEach((id, index) =>
      expect(MOMENTS[id]).toBeGreaterThan(MOMENTS[MOMENT_IDS[index]]),
    );
    expect(MOMENTS.sixty).toBe(0.81);
    expect(PHASE_RANGES.ramp.start).toBeCloseTo(3, 2);
    expect(MOMENTS.stopped).toBeLessThan(RUN_SECONDS);
    expect(MOMENTS.twistComplete).toBeLessThan(PHASE_RANGES.landing.start);
  });

  it('reaches 60 mph in 0.81 s and the loop at 18 m/s', () => {
    expect(carAt(MOMENTS.sixty).speed).toBeCloseTo(SIXTY_MPH_MS, 9);
    const entry = carAt(PHASE_RANGES.ramp.start);
    expect(entry.position[0]).toBeCloseTo(RAMP.entryX, 6);
    expect(entry.speed).toBeCloseTo(ENTRY_SPEED_MS, 6);
  });

  it('turns over the top of the loop at 11.3 m/s and leaves the deck end inverted', () => {
    const top = carAt(MOMENTS.inverted);
    expect(top.position[0]).toBeCloseTo(RAMP.entryX, 6);
    expect(top.position[1]).toBeCloseTo(2 * RAMP.radius, 6);
    expect(top.speed).toBeCloseTo(11.3, 1);
    expect(top.pitch).toBeCloseTo(Math.PI, 6);
    expect(top.roll).toBe(0);
    const exit = carAt(MOMENTS.leavesRamp);
    expect(exit.position[0]).toBeCloseTo(DECK_END_X, 6);
    expect(exit.speed).toBeCloseTo(EXIT_SPEED_MS, 9);
  });

  it('rolls upright in the air and lands near x 30 in the first landing box', () => {
    expect(toDegrees(carAt(MOMENTS.rollComplete).roll)).toBeCloseTo(180, 6);
    const touchdown = carAt(MOMENTS.touchdown);
    expect(touchdown.position[1]).toBeCloseTo(0, 9);
    expect(within(SITE.landingBox.x, touchdown.position[0])).toBe(true);
    expect(Math.abs(touchdown.position[0] - 30)).toBeLessThan(POSITION_TOLERANCE_M + 0.5);
  });

  it('leaps from x -3, peaks 8 m up over the row and twists a full turn', () => {
    const liftOff = carAt(MOMENTS.liftOff);
    expect(liftOff.position[0]).toBeCloseTo(JUMP.leapX, 6);
    expect(liftOff.speed).toBeCloseTo(RUN_UP_SPEED_MS, 3);
    const apex = carAt(MOMENTS.apex);
    expect(apex.position[1]).toBeCloseTo(8, 6);
    expect(Math.abs(apex.position[0] + 28)).toBeLessThan(POSITION_TOLERANCE_M);
    expect(toDegrees(carAt(MOMENTS.twistComplete).roll)).toBeCloseTo(540, 6);
    expect(within(SITE.jumpLandingBox.x, carAt(MOMENTS.landed).position[0])).toBe(true);
    expect(carAt(MOMENTS.stopped).speed).toBeCloseTo(0, 9);
    expect(carAt(MOMENTS.stopped).position[0]).toBeGreaterThan(SITE.run.x[0] + CAR.length);
  });

  it('cushions both touchdowns to 2.5 m/s at the ground', () => {
    [catchFallAt(CATCH_SECONDS), landingFallAt(LANDING_SECONDS)].forEach((fall) => {
      expect(fall.height).toBeCloseTo(0, 9);
      expect(fall.verticalSpeed).toBeCloseTo(-TOUCHDOWN_SPEED_MS, 9);
    });
    expect(CATCH_THRUST_N / 1000).toBeCloseTo(28.3, 1);
    expect(CATCH_THRUST_N).toBeLessThan(CORNER_NOZZLE_IDS.length * CORNER_NOZZLE_MAX_N);
    expect(LEAP_THRUST_N).toBe(40000);
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
    const seconds = [0.5, 2, 3.6, 4.5, 6.2, 8, 10, 12, 15];
    const forward = seconds.map((t) => track(carAt(t)));
    const backward = [...seconds].reverse().map((t) => track(carAt(t)));
    expect(backward.reverse()).toEqual(forward);
    expect(track(carAt(-1))).toEqual(track(carAt(0)));
    expect(track(carAt(RUN_SECONDS + 1))).toEqual(track(carAt(RUN_SECONDS)));
  });

  it('flags the car on the ground, on the ramp and in the air', () => {
    expect(carAt(2).onGround).toBe(true);
    expect(carAt(4).onRamp).toBe(true);
    expect(carAt(5).airborne).toBe(true);
    expect(carAt(8).onGround).toBe(true);
    expect(carAt(10).airborne).toBe(true);
    expect(carAt(15).onGround).toBe(true);
  });

  it('squats the suspension on landing without touching the body down', () => {
    const depths = Array.from(
      { length: 50 },
      (_, step) => carAt(MOMENTS.landed + step * 0.01).position[1],
    );
    expect(Math.min(...depths)).toBeCloseTo(-LANDING_SQUAT_M, 3);
    expect(Math.min(...depths)).toBeGreaterThan(-CAR.rideHeight);
    expect(carAt(MOMENTS.landed + 0.5).height).toBe(0);
  });

  it('fires the nozzles in the order of the three tests', () => {
    REAR_NOZZLE_IDS.forEach((id) => expect(nozzlesAt(0.5)[id]).toBeCloseTo(14072, 0));
    [2, 4, 4.85, 8, 11.2, 14].forEach((t) => expect(firing(t), `at ${t}`).toEqual({}));
    expect(firing(5)).toEqual({ cornerFrontLeft: ROLL_NOZZLE_N, cornerRearLeft: ROLL_NOZZLE_N });
    expect(firing(5.5)).toEqual({
      cornerFrontRight: ROLL_NOZZLE_N,
      cornerRearRight: ROLL_NOZZLE_N,
    });
    expect(Object.keys(firing(6.2))).toEqual([...CORNER_NOZZLE_IDS]);
    REAR_NOZZLE_IDS.forEach((id) => expect(nozzlesAt(6.9)[id]).toBeCloseTo(2550, 0));
    CORNER_NOZZLE_IDS.forEach((id) => expect(nozzlesAt(9.3)[id]).toBe(CORNER_NOZZLE_MAX_N));
    expect(Object.keys(firing(9.9))).toEqual(['cornerFrontLeft', 'cornerRearLeft']);
    expect(Object.keys(firing(10.5))).toEqual(['cornerFrontRight', 'cornerRearRight']);
    expect(Object.keys(firing(12))).toEqual([...CORNER_NOZZLE_IDS]);
  });

  it('turns the fans on along the ramp only', () => {
    expect(fansAt(2.9)).toBe(false);
    expect(fansAt(4)).toBe(true);
    expect(fansAt(5)).toBe(false);
    expect(runAt(4)).toEqual({ phase: 'ramp', car: carAt(4), nozzles: nozzlesAt(4), fans: true });
  });
});

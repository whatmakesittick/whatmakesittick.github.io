import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { CORNER_NOZZLE_IDS, FRONT_NOZZLE_IDS, REAR_NOZZLE_IDS } from '../ids';
import {
  CAR,
  NOZZLES,
  RAMP,
  RAMP_EXIT_X,
  ROLL_ARM_M,
  SEAT,
  SITE,
  SITE_ANCHORS,
  TANK,
  rampHeight,
  rampPitch,
  rampRoll,
} from './layout';

describe('layout', () => {
  it('runs the ramp from flat at the entry to 4 m and 42 degrees at the exit', () => {
    expect(rampHeight(0)).toBe(0);
    expect(rampHeight(1)).toBeCloseTo(RAMP.exitHeight, 9);
    expect(rampPitch(0)).toBe(0);
    expect(toDegrees(rampPitch(1))).toBeCloseTo(RAMP.exitAngleDeg, 1);
    expect(RAMP_EXIT_X).toBe(36);
    expect(SITE_ANCHORS.rampExit).toEqual([36, RAMP.exitHeight, 0]);
  });

  it('rolls the track half a turn, right side down first', () => {
    expect(rampRoll(0)).toBe(0);
    expect(rampRoll(0.5)).toBeCloseTo(Math.PI / 2, 9);
    expect(rampRoll(1)).toBeCloseTo(Math.PI, 9);
  });

  it('points the corner nozzles down, the front ones sideways and the rear ones back', () => {
    CORNER_NOZZLE_IDS.forEach((id) => expect(NOZZLES[id].dir).toEqual([0, -1, 0]));
    FRONT_NOZZLE_IDS.forEach((id) => expect(Math.abs(NOZZLES[id].dir[2])).toBe(1));
    REAR_NOZZLE_IDS.forEach((id) => expect(NOZZLES[id].dir).toEqual([-1, 0, 0]));
    expect(Math.abs(NOZZLES.cornerFrontLeft.at[2])).toBe(ROLL_ARM_M);
  });

  it('seats the driver on the left and carries the tank on the right', () => {
    expect(SEAT[2]).toBeLessThan(0);
    expect(TANK.centre[2]).toBeGreaterThan(0);
    expect(CAR.wheelbase).toBe(2.825);
  });

  it('paints the landing box past the ramp inside the run', () => {
    expect(SITE.landingBox.x[0]).toBeGreaterThan(RAMP_EXIT_X);
    expect(SITE.landingBox.x[1]).toBeLessThan(SITE.run.x[1]);
  });
});

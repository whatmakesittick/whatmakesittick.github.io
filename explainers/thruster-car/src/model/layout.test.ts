import { describe, expect, it } from 'vitest';
import { CORNER_NOZZLE_IDS, FRONT_NOZZLE_IDS, REAR_NOZZLE_IDS } from '../ids';
import {
  CAR,
  DECK_END_X,
  JUMP,
  LOOP_LENGTH,
  NOZZLES,
  PARKED_ROW,
  RAMP,
  RAMP_LENGTH,
  ROLL_ARM_M,
  ROW_TOP,
  SEAT,
  SITE,
  SITE_ANCHORS,
  SITE_REGIONS,
  TANK,
  rampPitch,
  rampPoint,
} from './layout';

describe('layout', () => {
  it('climbs a 5 m half loop on its far side and comes over the top moving back', () => {
    expect(rampPoint(0)).toEqual([RAMP.entryX, 0, 0]);
    const [sideX, sideY] = rampPoint(LOOP_LENGTH / 2);
    expect(sideX).toBeCloseTo(RAMP.entryX + RAMP.radius, 9);
    expect(sideY).toBeCloseTo(RAMP.radius, 9);
    const [topX, topY] = rampPoint(LOOP_LENGTH);
    expect(topX).toBeCloseTo(RAMP.entryX, 9);
    expect(topY).toBeCloseTo(2 * RAMP.radius, 9);
    expect(rampPitch(0)).toBe(0);
    expect(rampPitch(LOOP_LENGTH / 2)).toBeCloseTo(Math.PI / 2, 9);
  });

  it('runs an 8 m inverted deck 10 m up back toward the start', () => {
    expect(RAMP_LENGTH).toBeCloseTo(Math.PI * RAMP.radius + RAMP.deckLength, 9);
    expect(rampPoint(RAMP_LENGTH)).toEqual([DECK_END_X, RAMP.exitHeight, 0]);
    expect(DECK_END_X).toBe(52);
    expect(rampPitch(RAMP_LENGTH)).toBeCloseTo(Math.PI, 9);
    expect(rampPoint(RAMP_LENGTH + 5)).toEqual(rampPoint(RAMP_LENGTH));
    expect(SITE_ANCHORS.rampExit).toEqual(rampPoint(RAMP_LENGTH));
  });

  it('parks a truck and three cars between the leap point and the second landing box', () => {
    expect(PARKED_ROW.filter((vehicle) => vehicle.kind === 'truck')).toHaveLength(1);
    expect(ROW_TOP).toBe(4);
    PARKED_ROW.forEach((vehicle) => {
      expect(vehicle.centreX + vehicle.length / 2).toBeLessThan(JUMP.leapX);
      expect(vehicle.centreX - vehicle.length / 2).toBeGreaterThan(SITE.jumpLandingBox.x[1]);
    });
    expect(SITE_REGIONS.jump.x[0]).toBeLessThan(SITE.jumpLandingBox.x[0]);
  });

  it('keeps both landing boxes, the finish line and the ramp on the runway', () => {
    const [start, end] = SITE.run.x;
    [SITE.landingBox.x, SITE.jumpLandingBox.x].forEach(([from, to]) => {
      expect(from).toBeGreaterThan(start);
      expect(to).toBeLessThan(end);
    });
    expect(SITE.landingBox.x[1]).toBeLessThan(DECK_END_X);
    expect(SITE.finishLineX).toBeLessThan(RAMP.entryX);
    expect(RAMP.entryX + RAMP.radius).toBeLessThan(end);
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
});

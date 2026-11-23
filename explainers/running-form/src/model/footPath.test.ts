import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { FOOT_PATH_POINTS, ankleAgainstHip, footPathAt, landingReachM } from './footPath';
import { GAIT_DATA } from './gaitData';
import { strideLengthM } from './paces';

const FOOT_ROLL_RANGE_M = [0.05, 0.35] as const;
const SLIP_LIMIT_CM = 1.5;

describe('foot path', () => {
  it('closes the loop over one cycle', () => {
    PACE_IDS.forEach((pace) => {
      const path = footPathAt(pace, 0);
      expect(path).toHaveLength(FOOT_PATH_POINTS);
      expect(path[0].x).toBeCloseTo(path[FOOT_PATH_POINTS - 1].x, 1);
      expect(path[0].y).toBeCloseTo(path[FOOT_PATH_POINTS - 1].y, 1);
    });
  });

  it('keeps the ankle below the hip within a leg length', () => {
    footPathAt('steady', 0).forEach((point) => {
      expect(point.y).toBeLessThan(-0.3);
      expect(point.y).toBeGreaterThan(-0.9);
    });
  });

  it('lands the ankle about 0.33 m ahead of the hip at the steady pace', () => {
    expect(landingReachM('steady', 0)).toBeGreaterThan(0.3);
    expect(landingReachM('steady', 0)).toBeLessThan(0.36);
  });

  it('moves the landing reach by the sourced centimetres at the ends of the slider', () => {
    PACE_IDS.forEach((pace) => {
      const base = landingReachM(pace, 0);
      const quick = (landingReachM(pace, 10) - base) * 100;
      const slow = (landingReachM(pace, -10) - base) * 100;
      expect(Math.abs(quick - -2.2)).toBeLessThan(SLIP_LIMIT_CM);
      expect(Math.abs(slow - 2.2)).toBeLessThan(SLIP_LIMIT_CM);
    });
  });

  it('closes the kinematics: the ankle travel plus foot roll matches the road travel in stance', () => {
    PACE_IDS.forEach((pace) => {
      const { toeOffUnits } = GAIT_DATA[pace];
      const span = ankleAgainstHip(0, pace, 0).x - ankleAgainstHip(toeOffUnits, pace, 0).x;
      const travel = (strideLengthM(pace, 0) * toeOffUnits) / 1000;
      expect(travel - span).toBeGreaterThan(FOOT_ROLL_RANGE_M[0]);
      expect(travel - span).toBeLessThan(FOOT_ROLL_RANGE_M[1]);
    });
  });
});

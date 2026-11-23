import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { SIDE_IDS } from '../ids';
import type { GaitReading } from '../ids';
import { FOREARM_M, HIP_HEIGHT_M, SHANK_M, THIGH_M, UPPER_ARM_M } from '../model/body';
import { gaitAt } from '../model/gait';
import { GAIT_DATA } from '../model/gaitData';
import { referencePose } from './runnerPose';

const SAMPLES = Array.from({ length: 50 }, (_, index) => index * 20 + 7);
const SLIP_BOUND_M = 0.4;
const CONTACT_HEIGHT_RANGE_M = [-0.03, 0.15] as const;
const LOWEST_SOLE_BOUND_M = -0.03;
const STATURE_RANGE_M = [1.72, 1.85] as const;

function reading(units: number, pace = 'steady' as (typeof PACE_IDS)[number]): GaitReading {
  return gaitAt(units, { pace, stepRate: 0, arms: 'swing' });
}

describe('reference pose', () => {
  it('keeps every segment at its length', () => {
    SAMPLES.forEach((units) => {
      const pose = referencePose(reading(units));
      SIDE_IDS.forEach((side) => {
        const leg = pose.legs[side];
        const arm = pose.arms[side];
        expect(leg.hip.distanceTo(leg.knee)).toBeCloseTo(THIGH_M, 9);
        expect(leg.knee.distanceTo(leg.ankle)).toBeCloseTo(SHANK_M, 9);
        expect(arm.shoulder.distanceTo(arm.elbow)).toBeCloseTo(UPPER_ARM_M, 9);
        expect(arm.elbow.distanceTo(arm.wrist)).toBeCloseTo(FOREARM_M, 9);
      });
    });
  });

  it('puts the right side on the positive z side', () => {
    SAMPLES.forEach((units) => {
      const pose = referencePose(reading(units));
      expect(pose.legs.right.hip.z).toBeGreaterThan(pose.legs.left.hip.z);
      expect(pose.arms.right.shoulder.z).toBeGreaterThan(pose.arms.left.shoulder.z);
    });
  });

  it('places the pelvis at the mean hip height plus the rise of the body', () => {
    const state = reading(150);
    const pose = referencePose(state);
    expect(pose.pelvis.y).toBeCloseTo(HIP_HEIGHT_M + state.com.heightM, 9);
    expect(pose.pelvis.x).toBeCloseTo(state.com.surgeM, 9);
  });

  it('leans the trunk by the reading and keeps the head level', () => {
    SAMPLES.forEach((units) => {
      const state = reading(units, 'fast');
      const pose = referencePose(state);
      const lean =
        (Math.atan2(Math.hypot(pose.trunkUp.x, pose.trunkUp.z), pose.trunkUp.y) * 180) / Math.PI;
      expect(lean).toBeCloseTo(state.upper.leanDeg, 4);
      expect(pose.headTop.x).toBeCloseTo(pose.headCentre.x, 6);
      expect(pose.headTop.z).toBeCloseTo(pose.headCentre.z, 6);
      expect(pose.headTop.y).toBeGreaterThan(pose.headCentre.y);
      expect(pose.trunkForward.dot(pose.trunkUp)).toBeCloseTo(0, 9);
    });
  });

  it('stands about as tall as the runner', () => {
    PACE_IDS.forEach((pace) => {
      const { headTop } = referencePose(reading(431, pace));
      expect(headTop.y).toBeGreaterThan(STATURE_RANGE_M[0]);
      expect(headTop.y).toBeLessThan(STATURE_RANGE_M[1]);
    });
  });

  it('gives a contact point only while the foot is down', () => {
    PACE_IDS.forEach((pace) => {
      const { toeOffUnits } = GAIT_DATA[pace];
      expect(referencePose(reading(toeOffUnits - 5, pace)).legs.right.contact).not.toBeNull();
      expect(referencePose(reading(toeOffUnits + 5, pace)).legs.right.contact).toBeNull();
      expect(referencePose(reading(toeOffUnits + 5, pace)).legs.left.contact).toBeNull();
      expect(referencePose(reading(600, pace)).legs.left.contact).not.toBeNull();
    });
  });

  it('plants the stance foot only loosely: a known slip against the road', () => {
    PACE_IDS.forEach((pace) => {
      const { toeOffUnits } = GAIT_DATA[pace];
      const rel: number[] = [];
      for (let units = 0; units < toeOffUnits; units += 5) {
        const state = reading(units, pace);
        const contact = referencePose(state).legs.right.contact;
        expect(contact).not.toBeNull();
        expect(contact?.y).toBeGreaterThan(CONTACT_HEIGHT_RANGE_M[0]);
        expect(contact?.y).toBeLessThan(CONTACT_HEIGHT_RANGE_M[1]);
        rel.push((contact?.x ?? 0) + (state.right.roadTravelM ?? 0));
      }
      const slip = Math.max(...rel) - Math.min(...rel);
      expect(slip).toBeLessThan(SLIP_BOUND_M);
      expect(slip).toBeGreaterThan(0.05);
    });
  });

  it('keeps both feet above the road to within the known error', () => {
    PACE_IDS.forEach((pace) => {
      for (let units = 0; units < 1000; units += 10) {
        const pose = referencePose(reading(units, pace));
        SIDE_IDS.forEach((side) => {
          const leg = pose.legs[side];
          [leg.heel, leg.ball, leg.toe].forEach((point) =>
            expect(point.y).toBeGreaterThan(LOWEST_SOLE_BOUND_M),
          );
        });
      }
    });
  });

  it('turns the pelvis with the reading', () => {
    const state = reading(115);
    const pose = referencePose(state);
    const hipLine = pose.legs.right.hip.clone().sub(pose.legs.left.hip);
    const yaw = (Math.atan2(-hipLine.x, hipLine.z) * 180) / Math.PI;
    expect(Math.abs(yaw)).toBeGreaterThan(0.5 * Math.abs(state.upper.pelvisRotDeg));
  });
});

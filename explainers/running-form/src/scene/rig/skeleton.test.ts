import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { SIDE_IDS } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { footPathAt } from '../../model/footPath';
import { CYCLE_UNITS } from '../../model/timeMap';
import { stepRateEffect } from '../../model/stepRate';
import {
  HALF_CYCLE,
  PROBE_PACES,
  PROBE_STEP_RATES,
  groundProbe,
  landingReach,
  mirrorError,
  pelvisPath,
  phaseDeviations,
  range,
  readingAt,
  skeletonAt,
  stanceSlip,
  wristMidline,
} from './probes.testkit';
import { poseOf, solvePose, solveSkeleton } from './skeleton';

const TIMEOUT_MS = 600_000;
const MM = 0.001;
const CM = 0.01;
const SLIP_LIMIT_M = 5 * MM;
const BELOW_ROAD_LIMIT_M = -2 * MM;
const SWING_CLEARANCE_M = 15 * MM;
const SWING_LIMIT_DEG = 1.5;
const STANCE_LIMIT_DEG = 23;
const RECOVERY_LIMIT_DEG = 31;
const APPROACH_LIMIT_DEG = 10;
const MIRROR_LIMIT_DEG = 1;
const BOUNCE_LIMIT_M = 2 * CM;
const STEADY_BOUNCE_M = [0.07, 0.1] as const;
const BOUNCE_CHANGE_POINTS = 6;
const SOURCED_BOUNCE_CHANGE = { slower: 23, faster: -16 } as const;
const LOWEST_WINDOW_UNITS = 30;
const LOWEST_STANCE_SHARE = 0.4;
const SURGE_LIMIT_M = 3 * CM;
const GRAVITY = 9.81;
const BALLISTIC_LIMIT = 1;
const FLOAT_MARGIN_UNITS = 10;
const LANDING_LIMIT_M = 13 * CM;
const CLOSURE_LIMIT_M = 0.1;
const UPPER_LIMIT_DEG = 1;
const GAZE_LIMIT_DEG = 2;
const MIDLINE_LIMIT_M = 0.05;
const HELD_HAND_TO_SHOULDER_M = 0.2;
const HELD_ELBOW_DEG = 60;
const STEP_FOR_SPEED = 1;

describe('runner skeleton', () => {
  it('is a pure function of the reading', () => {
    const reading = readingAt(237, 'steady', 3);
    const first = solvePose(reading);
    solvePose(readingAt(811, 'fast', -8, 'held'));
    const second = solvePose(reading);
    expect(second.legs.right.knee.toArray()).toEqual(first.legs.right.knee.toArray());
    expect(second.arms.left.wrist.toArray()).toEqual(first.arms.left.wrist.toArray());
  });

  it('repeats every cycle and mirrors the left leg half a cycle later', () => {
    PROBE_PACES.forEach((pace) => {
      const start = poseOf(skeletonAt(0, pace, 0));
      const end = poseOf(skeletonAt(CYCLE_UNITS, pace, 0));
      expect(end.legs.left.ankle.distanceTo(start.legs.left.ankle)).toBeLessThan(MM);
      PROBE_STEP_RATES.forEach((stepRate) =>
        expect(mirrorError(pace, stepRate)).toBeLessThan(MIRROR_LIMIT_DEG),
      );
    });
  });

  it(
    'keeps the stance foot planted on the road without slipping',
    () => {
      PROBE_PACES.forEach((pace) =>
        PROBE_STEP_RATES.forEach((stepRate) =>
          expect(stanceSlip(pace, stepRate)).toBeLessThan(SLIP_LIMIT_M),
        ),
      );
    },
    TIMEOUT_MS,
  );

  it(
    'never puts a sole below the road and clears it in the swing',
    () => {
      PROBE_PACES.forEach((pace) =>
        PROBE_STEP_RATES.forEach((stepRate) => {
          const probe = groundProbe(pace, stepRate);
          expect(probe.lowest).toBeGreaterThan(BELOW_ROAD_LIMIT_M);
          expect(probe.flagMismatches).toBe(0);
          expect(probe.swingClearance).toBeGreaterThan(SWING_CLEARANCE_M);
        }),
      );
    },
    TIMEOUT_MS,
  );

  it(
    'follows the leg data in the swing and stays near it in the stance',
    () => {
      PROBE_PACES.forEach((pace) =>
        PROBE_STEP_RATES.forEach((stepRate) => {
          const deviations = phaseDeviations(pace, stepRate);
          expect(deviations.swing).toBeLessThan(SWING_LIMIT_DEG);
          expect(deviations.stance).toBeLessThan(STANCE_LIMIT_DEG);
          expect(deviations.recovery).toBeLessThan(RECOVERY_LIMIT_DEG);
          expect(deviations.approach).toBeLessThan(APPROACH_LIMIT_DEG);
        }),
      );
    },
    TIMEOUT_MS,
  );

  it('bounces with the centre of mass and surges with it', () => {
    PROBE_PACES.forEach((pace) => {
      const toeOff = GAIT_DATA[pace].toeOffUnits;
      const path = pelvisPath(pace, 0);
      const { com } = path.readings[0];
      expect(Math.abs(range(path.heights) - com.risePeakToPeakM)).toBeLessThan(BOUNCE_LIMIT_M);
      expect(Math.abs(range(path.surges) - com.surgePeakToPeakM)).toBeLessThan(SURGE_LIMIT_M);
      const step = path.heights.slice(0, HALF_CYCLE);
      const lowest = step.indexOf(Math.min(...step));
      const highest = step.indexOf(Math.max(...step));
      expect(Math.abs(lowest - LOWEST_STANCE_SHARE * toeOff)).toBeLessThan(LOWEST_WINDOW_UNITS);
      expect(highest).toBeGreaterThan(toeOff);
    });
    const steady = range(pelvisPath('steady', 0).heights);
    expect(steady).toBeGreaterThan(STEADY_BOUNCE_M[0]);
    expect(steady).toBeLessThan(STEADY_BOUNCE_M[1]);
    const change = (stepRate: number) =>
      (range(pelvisPath('steady', stepRate).heights) / steady - 1) * 100;
    expect(Math.abs(change(-10) - SOURCED_BOUNCE_CHANGE.slower)).toBeLessThan(BOUNCE_CHANGE_POINTS);
    expect(Math.abs(change(10) - SOURCED_BOUNCE_CHANGE.faster)).toBeLessThan(BOUNCE_CHANGE_POINTS);
    expect(stepRateEffect(10).bounceFactor).toBeLessThan(1);
  });

  it('flies a ballistic arc through each float', () => {
    PROBE_PACES.forEach((pace) => {
      const toeOff = GAIT_DATA[pace].toeOffUnits;
      const { heights, readings } = pelvisPath(pace, 0, STEP_FOR_SPEED);
      const seconds = readings[0].timing.strideTimeS / CYCLE_UNITS;
      for (
        let units = toeOff + FLOAT_MARGIN_UNITS;
        units < HALF_CYCLE - FLOAT_MARGIN_UNITS;
        units++
      ) {
        const acceleration =
          (heights[units + 1] - 2 * heights[units] + heights[units - 1]) / (seconds * seconds);
        expect(Math.abs(acceleration + GRAVITY)).toBeLessThan(BALLISTIC_LIMIT);
      }
    });
  });

  it('lands the foot ahead of the hip and closes the stance in its own geometry', () => {
    PROBE_PACES.forEach((pace) => {
      const reach = landingReach(pace, 0);
      expect(Math.abs(reach.rig - reach.model)).toBeLessThan(LANDING_LIMIT_M);
      const toeOff = GAIT_DATA[pace].toeOffUnits;
      const off = skeletonAt(toeOff, pace, 0);
      const behind = off.pelvis.position.x - off.legs.right.ankle.x;
      const stance = (off.reading.timing.strideLengthM * toeOff) / CYCLE_UNITS;
      const roll = stance - reach.rig - behind;
      expect(roll).toBeGreaterThan(0.15 - CLOSURE_LIMIT_M);
      expect(roll).toBeLessThan(0.25 + CLOSURE_LIMIT_M);
      expect(footPathAt(pace, 0)).toHaveLength(101);
    });
  });

  it('honours the pelvis, trunk, arm and head rules of the reading', () => {
    [0, 120, 300, 480, 640, 900].forEach((units) => {
      const skeleton = skeletonAt(units, 'fast', 0);
      const { upper } = skeleton.reading;
      const pose = poseOf(skeleton);
      const lean = toDegrees(Math.atan2(pose.trunkUp.x, pose.trunkUp.y));
      expect(Math.abs(lean - upper.leanDeg)).toBeLessThan(UPPER_LIMIT_DEG);
      const hips = pose.legs.left.hip.clone().sub(pose.legs.right.hip);
      const roll = toDegrees(Math.atan2(-hips.y, Math.hypot(hips.x, hips.z)));
      expect(Math.abs(roll - upper.pelvisRollDeg)).toBeLessThan(UPPER_LIMIT_DEG);
      const turn = toDegrees(Math.atan2(-hips.x, -hips.z));
      expect(Math.abs(turn - upper.pelvisRotDeg)).toBeLessThan(UPPER_LIMIT_DEG);
      const twist = toDegrees(Math.atan2(-pose.trunkForward.z, pose.trunkForward.x));
      expect(Math.abs(twist - upper.shoulderRotDeg)).toBeLessThan(UPPER_LIMIT_DEG);
      SIDE_IDS.forEach((side) => {
        const arm = pose.arms[side];
        const upperArm = arm.elbow.clone().sub(arm.shoulder);
        const forearm = arm.wrist.clone().sub(arm.elbow);
        const elbow = 180 - toDegrees(upperArm.angleTo(forearm));
        expect(Math.abs(elbow - upper.elbowDeg[side])).toBeLessThan(UPPER_LIMIT_DEG);
      });
      const gaze = new Vector3(1, 0, 0).applyQuaternion(skeleton.head);
      expect(Math.abs(toDegrees(Math.asin(gaze.y)))).toBeLessThan(GAZE_LIMIT_DEG);
    });
  });

  it('keeps the hands off the far side and crosses the arms over the chest when held', () => {
    PROBE_PACES.forEach((pace) =>
      expect(wristMidline(pace, 0, 'swing')).toBeLessThan(MIDLINE_LIMIT_M),
    );
    [0, 250, 700].forEach((units) => {
      const reading = readingAt(units, 'steady', 0, 'held');
      reading.upper.elbowDeg = { right: HELD_ELBOW_DEG, left: HELD_ELBOW_DEG };
      const pose = poseOf(solveSkeleton(reading));
      expect(pose.arms.right.wrist.distanceTo(pose.arms.left.shoulder)).toBeLessThan(
        HELD_HAND_TO_SHOULDER_M,
      );
      expect(pose.arms.left.wrist.distanceTo(pose.arms.right.shoulder)).toBeLessThan(
        HELD_HAND_TO_SHOULDER_M,
      );
    });
  });
});

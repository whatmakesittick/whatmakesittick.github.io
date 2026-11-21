import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { lerp, toDegrees } from '@core/math';
import { KICK_IDS, PACE_IDS } from '../../ids';
import type { ArmId, KickId, PaceId } from '../../ids';
import { MOMENTS, phaseBounds, strokeAt } from '../../model';
import { PACES } from '../../model/paces';
import { GLIDE_KEY_SHARE, PULL_KEY_SHARE, HAND_DEPTH_M, ELBOW_DEG } from '../../model/stroke';
import { bodyPose } from '../pose';
import { BODY } from './constants';
import { createSkeleton, solveSkeleton } from './skeleton';
import type { Skeleton } from './skeleton';

const ROOT_Y = bodyPose(0, 0).y;
const ELBOW_TOLERANCE_DEG = 3;
const DEPTH_TOLERANCE_M = 0.05;
const PULL_END_DEPTH_TOLERANCE_M = 0.1;
const STEP_LIMIT_M = 0.015;
const ACCEL_LIMIT_M = 0.0012;
const HEEL_BACK_M = 0.05;
const SIDES = ['right', 'left'] as const;

function kickSkeletonAt(
  units: number,
  kick: KickId,
  pace: PaceId = 'middle',
  breathing: 'none' | 'right' = 'none',
): Skeleton {
  const reading = strokeAt(units, { pace, kick, breathing, headUp: false });
  return solveSkeleton(createSkeleton(), reading, 0, ROOT_Y);
}

function kneeFlexDeg(skeleton: Skeleton, id: ArmId): number {
  const { hip, knee, ankle } = skeleton.legs[id];
  const thigh = new Vector3().subVectors(hip, knee);
  const shank = new Vector3().subVectors(ankle, knee);
  return 180 - toDegrees(thigh.angleTo(shank));
}

function toeHeights(kick: KickId, id: ArmId): number[] {
  return Array.from({ length: 1000 }, (_, units) => kickSkeletonAt(units, kick).legs[id].toe.y);
}

function downbeats(heights: number[], minTravelM: number): number {
  let falling = false;
  let extreme = heights[0];
  let count = 0;
  [...heights, ...heights].forEach((height, index) => {
    const turned = falling ? height > extreme + minTravelM : height < extreme - minTravelM;
    if (turned) {
      falling = !falling;
      if (falling && index >= heights.length) count += 1;
      extreme = height;
    } else extreme = falling ? Math.min(extreme, height) : Math.max(extreme, height);
  });
  return count;
}

function headRollDeg(skeleton: Skeleton): number {
  const face = new Vector3(0, -1, 0).applyQuaternion(skeleton.head);
  return toDegrees(Math.atan2(face.z, -face.y));
}

function skeletonAt(
  units: number,
  pace: PaceId = 'middle',
  breathing: 'none' | 'right' = 'none',
): Skeleton {
  const reading = strokeAt(units, { pace, kick: 'six', breathing, headUp: false });
  return solveSkeleton(createSkeleton(), reading, 0, ROOT_Y);
}

const SCAN_STEP_UNITS = 5;
const BREATHING = ['none', 'right'] as const;

function scan(visit: (units: number, pace: PaceId, breathing: 'none' | 'right') => void): void {
  PACE_IDS.forEach((pace) =>
    BREATHING.forEach((breathing) => {
      for (let units = 0; units < 1000; units += SCAN_STEP_UNITS) visit(units, pace, breathing);
    }),
  );
}

function depressionDeg(bone: Vector3): number {
  return toDegrees(Math.asin(-bone.y / bone.length()));
}

function elbowAngle(skeleton: Skeleton): number {
  const { shoulder, elbow, wrist } = skeleton.arms.right;
  const up = new Vector3().subVectors(shoulder, elbow);
  const down = new Vector3().subVectors(wrist, elbow);
  return toDegrees(up.angleTo(down));
}

function handDepth(skeleton: Skeleton): number {
  return -(skeleton.arms.right.hand.y + ROOT_Y);
}

function joints(skeleton: Skeleton): Vector3[] {
  return (['right', 'left'] as const).flatMap((id) => [
    skeleton.arms[id].elbow,
    skeleton.arms[id].hand,
    skeleton.legs[id].knee,
    skeleton.legs[id].toe,
  ]);
}

describe('swimmer rig', () => {
  it('hits the sourced elbow angles', () => {
    expect(elbowAngle(skeletonAt(MOMENTS.catch))).toBeCloseTo(ELBOW_DEG.catch, -1);
    [
      [MOMENTS.catch, ELBOW_DEG.catch],
      [MOMENTS.underShoulder, ELBOW_DEG.underShoulder],
      [MOMENTS.pushEnd - 1, ELBOW_DEG.pushEnd],
    ].forEach(([units, angle]) => {
      expect(Math.abs(elbowAngle(skeletonAt(units)) - angle)).toBeLessThan(ELBOW_TOLERANCE_DEG);
    });
  });

  it('hits the keyed hand depths at every pace', () => {
    PACE_IDS.forEach((pace) => {
      const { pull, push } = phaseBounds(pace);
      [
        [0, HAND_DEPTH_M.entry],
        [pull[0] * GLIDE_KEY_SHARE, HAND_DEPTH_M.glide],
        [pull[0], HAND_DEPTH_M.catch],
        [lerp(pull[0], pull[1], PULL_KEY_SHARE), PACES[pace].pullKeyDepthM],
        [pull[1], HAND_DEPTH_M.pullEnd],
        [(push[0] + push[1]) / 2, HAND_DEPTH_M.pushMean],
        [push[1] - 0.01, HAND_DEPTH_M.pushEnd],
      ].forEach(([units, depth]) => {
        const tolerance =
          depth === HAND_DEPTH_M.pullEnd ? PULL_END_DEPTH_TOLERANCE_M : DEPTH_TOLERANCE_M;
        expect(Math.abs(handDepth(skeletonAt(units, pace)) - depth)).toBeLessThan(tolerance);
      });
    });
  });

  it('is periodic and moves smoothly at every scrubber position', () => {
    PACE_IDS.forEach((pace) => {
      ['none', 'right'].forEach((breathing) => {
        const first = joints(skeletonAt(0, pace, breathing as 'none'));
        const last = joints(skeletonAt(1000, pace, breathing as 'none'));
        first.forEach((joint, index) => expect(joint.distanceTo(last[index])).toBeLessThan(1e-6));
        let previous = first;
        for (let units = 1; units <= 1000; units += 1) {
          const next = joints(skeletonAt(units, pace, breathing as 'none'));
          next.forEach((joint, index) =>
            expect(joint.distanceTo(previous[index])).toBeLessThan(STEP_LIMIT_M),
          );
          previous = next;
        }
      });
    });
  });

  it('keeps the recovering hand in the air and the right hand entering in front', () => {
    const recovery = skeletonAt(MOMENTS.recoveryMid);
    expect(recovery.arms.right.hand.y + ROOT_Y).toBeGreaterThan(0.04);
    expect(recovery.arms.right.elbow.y).toBeGreaterThan(recovery.arms.right.hand.y);
    const entry = skeletonAt(0);
    expect(entry.arms.right.hand.x).toBeGreaterThan(0.5);
    expect(entry.arms.left.hand.y).toBeLessThan(entry.arms.right.hand.y);
  });

  it('keeps the handedness of the spec', () => {
    const entry = skeletonAt(0);
    const next = skeletonAt(4);
    expect(next.legs.left.toe.y).toBeLessThan(entry.legs.left.toe.y);
    expect(next.legs.right.toe.y).toBeGreaterThan(entry.legs.right.toe.y);
    const rolled = skeletonAt(250);
    expect(rolled.arms.right.shoulder.y).toBeLessThan(rolled.arms.left.shoulder.y);
    const breath = skeletonAt(877, 'middle', 'right');
    const face = new Vector3(0, -1, 0).applyQuaternion(breath.head);
    expect(face.z).toBeGreaterThan(0.9);
  });

  it('slides the shoulder forward on entry and back through the push', () => {
    const entry = skeletonAt(0).arms.right.shoulder;
    const pushEnd = skeletonAt(MOMENTS.pushEnd).arms.right.shoulder;
    expect(entry.x - pushEnd.x).toBeGreaterThan(0.06);
  });

  it('flexes the wrist so the fingers lead the forearm into the catch', () => {
    const { elbow, wrist, handAxis } = skeletonAt(MOMENTS.catch).arms.right;
    const forearm = new Vector3().subVectors(wrist, elbow).normalize();
    expect(handAxis.y).toBeLessThan(forearm.y - 0.1);
  });

  it('holds the elbow high through the catch', () => {
    const minSteeperForearmDeg = 15;
    const { shoulder, elbow, wrist } = skeletonAt(MOMENTS.catch).arms.right;
    const upper = new Vector3().subVectors(elbow, shoulder);
    const forearm = new Vector3().subVectors(wrist, elbow);
    expect(depressionDeg(forearm) - depressionDeg(upper)).toBeGreaterThan(minSteeperForearmDeg);
  });

  it('recovers with a high elbow: forearm hanging under it, hand close to the body', () => {
    const elbowHeightM = { min: 0.25, max: 0.42 };
    const elbowDeg = { min: 50, max: 115 };
    const maxWristFromElbowLineM = 0.18;
    const minWristBelowElbowM = 0.12;
    const maxFingertipFromMidlineM = 0.62;
    const middle = { from: 0.35, to: 0.65 };
    scan((units, pace, breathing) => {
      const { progress, underwater } = strokeAt(units, {
        pace,
        kick: 'six',
        breathing,
        headUp: false,
      }).right;
      if (underwater || progress < middle.from || progress > middle.to) return;
      const skeleton = skeletonAt(units, pace, breathing);
      const { elbow, wrist, handAxis } = skeleton.arms.right;
      const fingertipZ = wrist.z + handAxis.z * BODY.hand;
      expect(elbow.y + ROOT_Y).toBeGreaterThan(elbowHeightM.min);
      expect(elbow.y + ROOT_Y).toBeLessThan(elbowHeightM.max);
      expect(elbowAngle(skeleton)).toBeGreaterThan(elbowDeg.min);
      expect(elbowAngle(skeleton)).toBeLessThan(elbowDeg.max);
      expect(Math.abs(wrist.z - elbow.z)).toBeLessThan(maxWristFromElbowLineM);
      expect(elbow.y - wrist.y).toBeGreaterThan(minWristBelowElbowM);
      expect(fingertipZ).toBeLessThan(maxFingertipFromMidlineM);
    });
  });

  it('exits the push with the palm facing the thigh', () => {
    const { palm } = skeletonAt(MOMENTS.pushEnd).arms.right;
    expect(palm.z).toBeLessThan(-0.7);
  });

  it('keeps the head far stiller than the shoulders when not breathing', () => {
    const maxHeadTiltDeg = 12;
    for (let units = 0; units < 1000; units += 25) {
      const face = new Vector3(0, -1, 0).applyQuaternion(skeletonAt(units).head);
      expect(Math.abs(toDegrees(Math.atan2(face.z, -face.y)))).toBeLessThan(maxHeadTiltDeg);
    }
  });

  it('keeps the hand under water through the stroke and above it through mid recovery', () => {
    const midRecovery = { from: 0.25, to: 0.75 };
    scan((units, pace, breathing) => {
      const reading = strokeAt(units, { pace, kick: 'six', breathing, headUp: false });
      const handY = skeletonAt(units, pace, breathing).arms.right.hand.y + ROOT_Y;
      const { underwater, progress } = reading.right;
      if (underwater) expect(handY).toBeLessThan(0);
      else if (progress > midRecovery.from && progress < midRecovery.to) {
        expect(handY).toBeGreaterThan(0);
      }
    });
  });

  it('never lets a hand cross the midline', () => {
    const minWidthM = 0.05;
    scan((units, pace, breathing) => {
      const { right, left } = skeletonAt(units, pace, breathing).arms;
      expect(right.hand.z).toBeGreaterThan(minWidthM);
      expect(left.hand.z).toBeLessThan(-minWidthM);
    });
  });

  it('moves the left arm as the right arm half a cycle later', () => {
    for (let units = 0; units < 1000; units += 50) {
      const left = skeletonAt(units).arms.left;
      const right = skeletonAt(units - 500).arms.right;
      [
        [left.elbow, right.elbow],
        [left.hand, right.hand],
      ].forEach(([joint, mirror]) => {
        expect(joint.distanceTo(new Vector3(mirror.x, mirror.y, -mirror.z))).toBeLessThan(1e-6);
      });
    }
  });

  it('tips the forearm down under a high elbow through the early pull', () => {
    const minSteeperForearmDeg = 35;
    PACE_IDS.forEach((pace) => {
      const { pull } = phaseBounds(pace);
      const { shoulder, elbow, wrist } = skeletonAt((pull[0] + pull[1]) / 2, pace).arms.right;
      const upper = new Vector3().subVectors(elbow, shoulder);
      const forearm = new Vector3().subVectors(wrist, elbow);
      expect(depressionDeg(forearm) - depressionDeg(upper)).toBeGreaterThan(minSteeperForearmDeg);
    });
  });

  it('leads the recovery with an elbow above the hand and outside the shoulder line', () => {
    const minElbowOutM = 0.05;
    const leadShare = { from: 0.2, to: 0.8 };
    scan((units, pace, breathing) => {
      const { progress, underwater } = strokeAt(units, {
        pace,
        kick: 'six',
        breathing,
        headUp: false,
      }).right;
      if (underwater || progress < leadShare.from || progress > leadShare.to) return;
      const { shoulder, elbow, hand } = skeletonAt(units, pace, breathing).arms.right;
      expect(elbow.z - shoulder.z).toBeGreaterThan(minElbowOutM);
      expect(elbow.y).toBeGreaterThan(hand.y);
    });
  });

  it('bends the knee within a human range, most on the downbeat', () => {
    const maxFlexDeg = 45;
    const minPeakDeg = 20;
    KICK_IDS.forEach((kick) =>
      SIDES.forEach((id) => {
        let peak = { flex: 0, units: 0 };
        for (let units = 0; units < 1000; units += 2) {
          const flex = kneeFlexDeg(kickSkeletonAt(units, kick), id);
          expect(flex).toBeGreaterThan(-1);
          if (flex > peak.flex) peak = { flex, units };
        }
        expect(peak.flex).toBeLessThan(maxFlexDeg);
        expect(peak.flex).toBeGreaterThan(minPeakDeg);
        const after = kickSkeletonAt(peak.units + 4, kick).legs[id].toe.y;
        expect(after).toBeLessThan(kickSkeletonAt(peak.units, kick).legs[id].toe.y);
      }),
    );
  });

  it('moves the foot through a sourced kick depth', () => {
    const travelM = { min: 0.25, max: 0.45 };
    SIDES.forEach((id) => {
      const heights = toeHeights('six', id);
      const travel = Math.max(...heights) - Math.min(...heights);
      expect(travel).toBeGreaterThan(travelM.min);
      expect(travel).toBeLessThan(travelM.max);
    });
  });

  it('kicks three downbeats per leg a cycle in six-beat and one in two-beat', () => {
    const minTravelM = 0.1;
    SIDES.forEach((id) => {
      expect(downbeats(toeHeights('six', id), minTravelM)).toBe(3);
      expect(downbeats(toeHeights('two', id), minTravelM)).toBe(1);
    });
  });

  it('lets the heels break the surface by a few centimetres at most', () => {
    const maxAboveM = 0.045;
    KICK_IDS.forEach((kick) =>
      PACE_IDS.forEach((pace) => {
        for (let units = 0; units < 1000; units += SCAN_STEP_UNITS) {
          const { legs } = kickSkeletonAt(units, kick, pace);
          SIDES.forEach((id) => {
            const heel = legs[id].ankle.clone().addScaledVector(legs[id].sole, HEEL_BACK_M);
            expect(heel.y + ROOT_Y).toBeLessThan(maxAboveM);
          });
        }
      }),
    );
  });

  it('keeps the head level without a breath and turns it to the right for one', () => {
    const maxStillDeg = 4;
    const minBreathDeg = 75;
    PACE_IDS.forEach((pace) => {
      const { recovery } = phaseBounds(pace);
      for (let units = 0; units < 1000; units += SCAN_STEP_UNITS) {
        expect(Math.abs(headRollDeg(skeletonAt(units, pace)))).toBeLessThan(maxStillDeg);
      }
      const inhale = lerp(recovery[0], recovery[1], 0.3);
      expect(headRollDeg(skeletonAt(inhale, pace, 'right'))).toBeGreaterThan(minBreathDeg);
      const beforeEntry = lerp(recovery[0], recovery[1], 0.9);
      expect(Math.abs(headRollDeg(skeletonAt(beforeEntry, pace, 'right')))).toBeLessThan(
        maxStillDeg,
      );
    });
  });

  it('never jerks a joint between neighbouring scrubber steps', () => {
    const tracked = (skeleton: Skeleton): Vector3[] => [
      ...joints(skeleton),
      ...SIDES.flatMap((id) => [skeleton.arms[id].wrist, skeleton.legs[id].ankle]),
      new Vector3(0, -1, 0).applyQuaternion(skeleton.head),
    ];
    PACE_IDS.forEach((pace) =>
      KICK_IDS.forEach((kick) =>
        BREATHING.forEach((breathing) => {
          let before = tracked(kickSkeletonAt(-1, kick, pace, breathing));
          let now = tracked(kickSkeletonAt(0, kick, pace, breathing));
          for (let units = 1; units <= 1000; units += 1) {
            const next = tracked(kickSkeletonAt(units, kick, pace, breathing));
            next.forEach((joint, index) => {
              const jerk = joint.clone().sub(now[index]).sub(now[index]).add(before[index]);
              expect(jerk.length()).toBeLessThan(ACCEL_LIMIT_M);
            });
            before = now;
            now = next;
          }
        }),
      ),
    );
  });
});

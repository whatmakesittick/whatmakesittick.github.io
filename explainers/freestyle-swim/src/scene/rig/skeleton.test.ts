import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { toDegrees } from '@core/math';
import { PACE_IDS } from '../../ids';
import type { PaceId } from '../../ids';
import { MOMENTS, phaseBounds, strokeAt } from '../../model';
import { HAND_DEPTH_M, ELBOW_DEG } from '../../model/stroke';
import { bodyPose } from '../pose';
import { createSkeleton, solveSkeleton } from './skeleton';
import type { Skeleton } from './skeleton';

const ROOT_Y = bodyPose(0, 0).y;
const ELBOW_TOLERANCE_DEG = 5;
const DEPTH_TOLERANCE_M = 0.05;
const STEP_LIMIT_M = 0.022;

function skeletonAt(
  units: number,
  pace: PaceId = 'middle',
  breathing: 'none' | 'right' = 'none',
): Skeleton {
  const reading = strokeAt(units, { pace, kick: 'six', breathing, headUp: false });
  return solveSkeleton(createSkeleton(), reading, 0, ROOT_Y);
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
        [(pull[0] + pull[1]) / 2, HAND_DEPTH_M.pullMean],
        [pull[1], HAND_DEPTH_M.pullEnd],
        [(push[0] + push[1]) / 2, HAND_DEPTH_M.pushMean],
        [push[1] - 0.01, HAND_DEPTH_M.pushEnd],
      ].forEach(([units, depth]) => {
        expect(Math.abs(handDepth(skeletonAt(units, pace)) - depth)).toBeLessThan(
          DEPTH_TOLERANCE_M,
        );
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
    expect(recovery.arms.right.hand.y + ROOT_Y).toBeGreaterThan(0.05);
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
});

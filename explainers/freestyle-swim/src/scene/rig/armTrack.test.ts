import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { BREATH_IDS, PACE_IDS, PHASE_IDS } from '../../ids';
import type { PaceId } from '../../ids';
import { phaseBounds } from '../../model/phases';
import { armAt, shoulderRollDegAt } from '../../model/stroke';
import { bodyPose } from '../pose';
import { SIDE, constructArm, createArmPose } from './arm';
import { solveArm } from './armTrack';
import { ARM_PERIOD, ARM_TRACK } from './constants';

const ROOT_Y = bodyPose(0, 0).y;
const MM = 1000;
const KEY_TOLERANCE_MM = 0.01;
const SPEED_SPAN_UNITS = 10;
const SPEED_SWING_LIMIT = 0.5;
const SLOW_MM_PER_UNIT = 1.5;

function unitsAt(clock: number, pace: PaceId): number {
  const phase = Math.floor(clock);
  const [start, end] = phaseBounds(pace)[PHASE_IDS[phase]];
  return start + (clock - phase) * (end - start);
}

function handSpeeds(pace: PaceId): number[] {
  const pose = createArmPose();
  const setup = { pace, breathing: 'none', rootY: ROOT_Y } as const;
  const hands = Array.from({ length: 1000 / SPEED_SPAN_UNITS + 1 }, (_, index) => {
    solveArm(pose, 'right', index * SPEED_SPAN_UNITS, setup);
    return pose.hand.clone();
  });
  return hands
    .slice(1)
    .map((hand, index) => (hand.distanceTo(hands[index]) * MM) / SPEED_SPAN_UNITS);
}

describe('arm track', () => {
  it('keeps its keys in order inside one stroke', () => {
    ARM_TRACK.forEach(([shownAt, poseAt], index) => {
      expect(shownAt).toBeGreaterThanOrEqual(0);
      expect(shownAt).toBeLessThan(ARM_PERIOD);
      expect(poseAt).toBeLessThan(ARM_PERIOD);
      if (index > 0) expect(shownAt).toBeGreaterThan(ARM_TRACK[index - 1][0]);
    });
  });

  it('shows the constructed pose exactly at every key that is not retimed', () => {
    const constructed = createArmPose();
    const shown = createArmPose();
    PACE_IDS.forEach((pace) =>
      BREATH_IDS.forEach((breathing) =>
        ARM_TRACK.filter(([shownAt, poseAt]) => shownAt === poseAt).forEach(([clock]) => {
          const units = unitsAt(clock, pace);
          const roll = toRadians(shoulderRollDegAt(units, pace, breathing));
          constructArm(constructed, armAt(units, pace), SIDE.right, roll, ROOT_Y);
          solveArm(shown, 'right', units, { pace, breathing, rootY: ROOT_Y });
          (['elbow', 'wrist', 'hand'] as const).forEach((joint) =>
            expect(shown[joint].distanceTo(constructed[joint]) * MM).toBeLessThan(KEY_TOLERANCE_MM),
          );
          expect(shown.palm.angleTo(constructed.palm)).toBeLessThan(1e-6);
        }),
      ),
    );
  });

  it('keeps the bones at their length between the keys', () => {
    const pose = createArmPose();
    const lengths = createArmPose();
    constructArm(lengths, armAt(0, 'middle'), SIDE.right, 0, ROOT_Y);
    const upper = lengths.elbow.distanceTo(lengths.shoulder);
    const fore = lengths.wrist.distanceTo(lengths.elbow);
    for (let units = 0; units < 1000; units += 7) {
      solveArm(pose, 'left', units, { pace: 'sprint', breathing: 'right', rootY: ROOT_Y });
      expect(pose.elbow.distanceTo(pose.shoulder)).toBeCloseTo(upper, 9);
      expect(pose.wrist.distanceTo(pose.elbow)).toBeCloseTo(fore, 9);
    }
  });

  it('moves the hand without bursts: its speed never swings by half within ten units', () => {
    PACE_IDS.forEach((pace) => {
      const speeds = handSpeeds(pace);
      speeds.forEach((speed, index) => {
        const next = speeds[(index + 1) % speeds.length];
        const swing = Math.abs(next - speed) / Math.max(next, speed, SLOW_MM_PER_UNIT);
        expect(swing).toBeLessThan(SPEED_SWING_LIMIT);
      });
    });
  });
});

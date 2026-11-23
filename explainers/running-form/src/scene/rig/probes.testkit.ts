import type { Vector3 } from 'three';
import { toDegrees } from '@core/math';
import type { ArmsId, GaitReading, PaceId, SideId } from '../../ids';
import { SIDE_IDS } from '../../ids';
import { gaitAt } from '../../model/gait';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS, wrapUnits } from '../../model/timeMap';
import { lowestSole, solePoints } from './foot';
import { poseOf, solveSkeleton } from './skeleton';
import type { RunnerSkeleton } from './skeleton';
import { legUnits } from './stance';

export const PROBE_PACES: readonly PaceId[] = ['easy', 'steady', 'fast'];
export const PROBE_STEP_RATES: readonly number[] = [-10, 0, 10];
const HALF = CYCLE_UNITS / 2;
const EVENT_MARGIN_UNITS = 15;
const CLEAR_AFTER_UNITS = 40;
const SLIP_STEP_UNITS = 1;
const RECOVERY_UNITS = 120;

export function readingAt(units: number, pace: PaceId, stepRate: number, arms: ArmsId = 'swing') {
  return gaitAt(wrapUnits(units), { pace, stepRate, arms });
}

export function skeletonAt(units: number, pace: PaceId, stepRate: number, arms: ArmsId = 'swing') {
  return solveSkeleton(readingAt(units, pace, stepRate, arms));
}

export interface LegDeviation {
  readonly hip: number;
  readonly knee: number;
  readonly ankle: number;
}

export function legDeviation(skeleton: RunnerSkeleton, side: SideId): LegDeviation {
  const { angles } = skeleton.legs[side].solution;
  const leg = skeleton.reading[side];
  return {
    hip: toDegrees(angles.hipFlex) - leg.hipFlexDeg,
    knee: toDegrees(angles.knee) - leg.kneeFlexDeg,
    ankle: toDegrees(angles.ankleDorsi) - leg.ankleDorsiDeg,
  };
}

function worst(deviation: LegDeviation): number {
  return Math.max(Math.abs(deviation.hip), Math.abs(deviation.knee), Math.abs(deviation.ankle));
}

export interface PhaseDeviations {
  readonly stance: number;
  readonly swing: number;
  readonly recovery: number;
}

export function phaseDeviations(pace: PaceId, stepRate: number, step = 5): PhaseDeviations {
  const toeOff = GAIT_DATA[pace].toeOffUnits;
  let stance = 0;
  let swing = 0;
  let recovery = 0;
  for (let units = 0; units < CYCLE_UNITS; units += step) {
    const value = worst(legDeviation(skeletonAt(units, pace, stepRate), 'right'));
    if (units < toeOff) stance = Math.max(stance, value);
    else if (units < toeOff + RECOVERY_UNITS) recovery = Math.max(recovery, value);
    else if (units < CYCLE_UNITS - EVENT_MARGIN_UNITS) swing = Math.max(swing, value);
  }
  return { stance, swing, recovery };
}

function lowestIndex(points: readonly Vector3[]): number {
  let best = 0;
  points.forEach((point, index) => {
    if (point.y < points[best].y) best = index;
  });
  return best;
}

export function stanceSlip(pace: PaceId, stepRate: number): number {
  const toeOff = GAIT_DATA[pace].toeOffUnits;
  let slip = 0;
  for (
    let units = EVENT_MARGIN_UNITS;
    units < toeOff - EVENT_MARGIN_UNITS;
    units += SLIP_STEP_UNITS
  ) {
    const here = skeletonAt(units, pace, stepRate);
    const next = skeletonAt(units + SLIP_STEP_UNITS, pace, stepRate);
    const sole = (skeleton: RunnerSkeleton) => {
      const { chain } = skeleton.legs.right.solution;
      return solePoints(chain.ankle, chain.foot, chain.toe, 'right');
    };
    const before = sole(here);
    const index = lowestIndex(before);
    const after = sole(next)[index];
    const travel = (here.reading.timing.strideLengthM * SLIP_STEP_UNITS) / CYCLE_UNITS;
    slip += Math.hypot(after.x - before[index].x + travel, after.z - before[index].z);
  }
  return slip;
}

export interface GroundProbe {
  readonly lowest: number;
  readonly flagMismatches: number;
  readonly swingClearance: number;
}

export function groundProbe(pace: PaceId, stepRate: number, step = 5): GroundProbe {
  const toeOff = GAIT_DATA[pace].toeOffUnits;
  let lowest = Infinity;
  let flagMismatches = 0;
  let swingClearance = Infinity;
  for (let units = 0; units < CYCLE_UNITS; units += step) {
    const skeleton = skeletonAt(units, pace, stepRate);
    SIDE_IDS.forEach((side) => {
      const { chain } = skeleton.legs[side].solution;
      const height = lowestSole(chain.ankle, chain.foot, chain.toe, side).y;
      const legAt = legUnits(units, side);
      lowest = Math.min(lowest, height);
      const nearEvent =
        legAt < EVENT_MARGIN_UNITS ||
        legAt > CYCLE_UNITS - EVENT_MARGIN_UNITS ||
        Math.abs(legAt - toeOff) < EVENT_MARGIN_UNITS;
      if (!nearEvent && height < 0.003 !== skeleton.reading[side].contact) flagMismatches += 1;
      if (legAt > toeOff + CLEAR_AFTER_UNITS && legAt < CYCLE_UNITS - CLEAR_AFTER_UNITS)
        swingClearance = Math.min(swingClearance, height);
    });
  }
  return { lowest, flagMismatches, swingClearance };
}

const MIRRORED_ANGLES = ['hipFlex', 'hipAdd', 'knee', 'ankleDorsi', 'toe'] as const;

export function mirrorError(pace: PaceId, stepRate: number, step = 25): number {
  let error = 0;
  for (let units = 0; units < HALF; units += step) {
    const right = skeletonAt(units + HALF, pace, stepRate).legs.right.solution.angles;
    const left = skeletonAt(units, pace, stepRate).legs.left.solution.angles;
    MIRRORED_ANGLES.forEach((key) => {
      error = Math.max(error, Math.abs(toDegrees(right[key] - left[key])));
    });
  }
  return error;
}

export interface PelvisPath {
  readonly heights: number[];
  readonly surges: number[];
  readonly readings: GaitReading[];
}

export function pelvisPath(pace: PaceId, stepRate: number, step = 1): PelvisPath {
  const heights: number[] = [];
  const surges: number[] = [];
  const readings: GaitReading[] = [];
  for (let units = 0; units < CYCLE_UNITS; units += step) {
    const skeleton = skeletonAt(units, pace, stepRate);
    heights.push(skeleton.pelvis.position.y);
    surges.push(skeleton.pelvis.position.x);
    readings.push(skeleton.reading);
  }
  return { heights, surges, readings };
}

export function range(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

export function landingReach(pace: PaceId, stepRate: number): { rig: number; model: number } {
  const skeleton = skeletonAt(0, pace, stepRate);
  const { chain } = skeleton.legs.right.solution;
  return { rig: chain.ankle.x - chain.hip.x, model: skeleton.reading.landing.reachM };
}

export function wristMidline(pace: PaceId, stepRate: number, arms: ArmsId, step = 10): number {
  let crossing = -Infinity;
  for (let units = 0; units < CYCLE_UNITS; units += step) {
    const pose = poseOf(skeletonAt(units, pace, stepRate, arms));
    crossing = Math.max(crossing, -pose.arms.right.wrist.z, pose.arms.left.wrist.z);
  }
  return crossing;
}

export function speedProfile(
  pace: PaceId,
  stepRate: number,
  point: (skeleton: RunnerSkeleton) => Vector3,
  step = 20,
): number[] {
  const speeds: number[] = [];
  for (let units = 0; units < CYCLE_UNITS; units += step) {
    const here = skeletonAt(units, pace, stepRate);
    const next = skeletonAt(units + 1, pace, stepRate);
    const seconds = here.reading.timing.strideTimeS / CYCLE_UNITS;
    speeds.push(point(next).distanceTo(point(here)) / seconds);
  }
  return speeds;
}

export const HALF_CYCLE = HALF;

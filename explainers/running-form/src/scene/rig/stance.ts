import { Vector3 } from 'three';
import { smoothstep } from '@core/math';
import type { GaitReading, PaceId, SideId } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS } from '../../model/timeMap';
import { lowestSole, plantFoot } from './foot';
import { Y_AXIS, about, apply, mirrorPoint, sideSign } from './frames';
import { closeLeg, footPitch, kneePole, legChain, mixAngles, targetAngles } from './leg';
import type { LegAngles, LegChain } from './leg';
import type { PelvisState } from './pelvis';
import { swingLeg } from './swing';
import { touchdownFor } from './touchdown';

export const LOCK_BLEND = {
  landBeforeUnits: 14,
  landAfterUnits: 10,
  leaveBeforeUnits: 12,
  leaveAfterUnits: 16,
} as const;

const PITCH_SEARCH_RAD = 0.6;
const GOLDEN_STEPS = 34;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
const UNITS_PER_STRIDE = CYCLE_UNITS;

export function legUnits(units: number, side: SideId): number {
  return side === 'right' ? units : (units + UNITS_PER_STRIDE / 2) % UNITS_PER_STRIDE;
}

export function sinceTouchdown(unitsOfLeg: number): number {
  return unitsOfLeg >= UNITS_PER_STRIDE - LOCK_BLEND.landBeforeUnits
    ? unitsOfLeg - UNITS_PER_STRIDE
    : unitsOfLeg;
}

export function lockWeight(unitsOfLeg: number, pace: PaceId): number {
  const since = sinceTouchdown(unitsOfLeg);
  const { toeOffUnits } = GAIT_DATA[pace];
  const landing = smoothstep(since, -LOCK_BLEND.landBeforeUnits, LOCK_BLEND.landAfterUnits);
  const leaving =
    1 -
    smoothstep(
      since,
      toeOffUnits - LOCK_BLEND.leaveBeforeUnits,
      toeOffUnits + LOCK_BLEND.leaveAfterUnits,
    );
  return Math.min(landing, leaving);
}

interface Planted {
  readonly chain: LegChain;
  readonly angles: LegAngles;
  readonly cost: number;
}

function cost(found: LegAngles, wanted: LegAngles): number {
  return (
    (found.hipFlex - wanted.hipFlex) ** 2 +
    (found.knee - wanted.knee) ** 2 +
    (found.ankleDorsi - wanted.ankleDorsi) ** 2
  );
}

export function plantedLeg(
  reading: GaitReading,
  side: SideId,
  pelvis: PelvisState,
  wanted: LegAngles,
  data: LegChain,
): Planted {
  const touchdown = touchdownFor(reading.pace, reading.stepRate);
  const yaw = sideSign(side) * touchdown.yaw;
  const heading = apply(about(Y_AXIS, yaw), 1, 0, 0);
  const since = sinceTouchdown(legUnits(reading.units, side));
  const travel = (reading.timing.strideLengthM * since) / UNITS_PER_STRIDE;
  const start = mirrorPoint(touchdown.contact, side);
  const pole = kneePole(data);
  const solve = (pitch: number): Planted => {
    const planted = plantFoot(yaw, pitch);
    const ankle = start
      .clone()
      .addScaledVector(heading, planted.along - touchdown.along)
      .add(new Vector3(-travel, 0, 0))
      .add(planted.offset);
    const closed = closeLeg(pelvis, side, ankle, pole, planted.rotation, planted.toe);
    return { ...closed, cost: cost(closed.angles, wanted) };
  };
  const guess = footPitch(data.foot);
  let low = guess - PITCH_SEARCH_RAD;
  let high = guess + PITCH_SEARCH_RAD;
  let a = high - GOLDEN * (high - low);
  let b = low + GOLDEN * (high - low);
  let costA = solve(a).cost;
  let costB = solve(b).cost;
  for (let step = 0; step < GOLDEN_STEPS; step += 1) {
    if (costA < costB) {
      high = b;
      b = a;
      costB = costA;
      a = high - GOLDEN * (high - low);
      costA = solve(a).cost;
    } else {
      low = a;
      a = b;
      costA = costB;
      b = low + GOLDEN * (high - low);
      costB = solve(b).cost;
    }
  }
  return solve((low + high) / 2);
}

export interface LegSolution {
  readonly chain: LegChain;
  readonly angles: LegAngles;
  readonly lock: number;
}

export function solveLeg(reading: GaitReading, side: SideId, pelvis: PelvisState): LegSolution {
  const unitsOfLeg = legUnits(reading.units, side);
  const swing = swingLeg(reading, side, pelvis, unitsOfLeg);
  const lock = lockWeight(unitsOfLeg, reading.pace);
  if (lock <= 0) return { chain: swing.chain, angles: swing.angles, lock };
  const wanted = targetAngles(
    reading,
    side,
    touchdownFor(reading.pace, reading.stepRate).abductionRad,
  );
  const planted = plantedLeg(reading, side, pelvis, wanted, legChain(pelvis, side, wanted));
  if (lock >= 1) return { chain: planted.chain, angles: planted.angles, lock };
  const angles = mixAngles(swing.angles, planted.angles, lock);
  const mixed = legChain(pelvis, side, angles);
  const below = -lowestSole(mixed.ankle, mixed.foot, mixed.toe, side).y;
  if (below <= 0) return { chain: mixed, angles, lock };
  const ankle = mixed.ankle.clone().setY(mixed.ankle.y + below);
  return { ...closeLeg(pelvis, side, ankle, kneePole(mixed), mixed.foot, mixed.toe), lock };
}

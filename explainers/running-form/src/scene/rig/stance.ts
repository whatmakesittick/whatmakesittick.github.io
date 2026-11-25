import { Vector3 } from 'three';
import type { GaitReading, PaceId, SideId } from '../../ids';
import { gaitAt } from '../../model/gait';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS } from '../../model/timeMap';
import { RIG_BODY } from './body';
import { plantFoot } from './foot';
import { Y_AXIS, about, apply, mirrorPoint, sideSign } from './frames';
import {
  addAngles,
  angleOffset,
  closeLeg,
  footPitch,
  kneePole,
  legChain,
  scaleAngles,
  targetAngles,
} from './leg';
import type { LegAngles, LegChain } from './leg';
import { pelvisAt } from './pelvis';
import type { PelvisState } from './pelvis';
import { swingLeg } from './swing';
import type { Handover, StanceEdges } from './swing';
import { touchdownFor } from './touchdown';

const PITCH_SEARCH_RAD = 0.6;
const GOLDEN_STEPS = 34;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
const UNITS_PER_STRIDE = CYCLE_UNITS;
const REACH_MARGIN_M = 0.004;
const REACH_LIMIT_M = RIG_BODY.thighM + RIG_BODY.shankM - REACH_MARGIN_M;
const OVERREACH_WEIGHT = 1e5;
const PITCH_WEIGHT = 0.5;
const RATE_SPAN_UNITS = 2;

export function legUnits(units: number, side: SideId): number {
  return side === 'right' ? units : (units + UNITS_PER_STRIDE / 2) % UNITS_PER_STRIDE;
}

function inStance(unitsOfLeg: number, pace: PaceId): boolean {
  return unitsOfLeg < GAIT_DATA[pace].toeOffUnits;
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

function plantedSolver(
  reading: GaitReading,
  side: SideId,
  pelvis: PelvisState,
  wanted: LegAngles,
  data: LegChain,
): (pitch: number) => Planted {
  const touchdown = touchdownFor(reading.pace, reading.stepRate);
  const yaw = sideSign(side) * touchdown.yaw;
  const heading = apply(about(Y_AXIS, yaw), 1, 0, 0);
  const travel = (reading.timing.strideLengthM * legUnits(reading.units, side)) / UNITS_PER_STRIDE;
  const start = mirrorPoint(touchdown.contact, side);
  const pole = kneePole(data);
  const dataPitch = footPitch(data.foot);
  const solve = (pitch: number): Planted => {
    const planted = plantFoot(yaw, pitch);
    const ankle = start
      .clone()
      .addScaledVector(heading, planted.along - touchdown.along)
      .add(new Vector3(-travel, 0, 0))
      .add(planted.offset);
    const closed = closeLeg(pelvis, side, ankle, pole, planted.rotation, planted.toe);
    const overreach = Math.max(ankle.distanceTo(closed.chain.hip) - REACH_LIMIT_M, 0);
    return {
      ...closed,
      cost:
        cost(closed.angles, wanted) +
        PITCH_WEIGHT * (pitch - dataPitch) ** 2 +
        OVERREACH_WEIGHT * overreach * overreach,
    };
  };
  return solve;
}

function plantedLeg(
  reading: GaitReading,
  side: SideId,
  pelvis: PelvisState,
  wanted: LegAngles,
  data: LegChain,
): Planted {
  const solve = plantedSolver(reading, side, pelvis, wanted, data);
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
  readonly planted: boolean;
}

const edgeCache = new Map<string, StanceEdges>();

function plantedOffset(units: number, pace: PaceId, stepRate: number): LegAngles {
  const reading = gaitAt(units, { pace, stepRate, arms: 'swing' });
  const touchdown = touchdownFor(pace, stepRate);
  const pelvis = pelvisAt(reading, touchdown.hipHeightM);
  const wanted = targetAngles(reading, 'right', touchdown.abductionRad);
  const planted = plantedLeg(reading, 'right', pelvis, wanted, legChain(pelvis, 'right', wanted));
  return angleOffset(wanted, planted.angles);
}

function handover(units: number, toward: number, pace: PaceId, stepRate: number): Handover {
  const offset = plantedOffset(units, pace, stepRate);
  const other = plantedOffset(toward, pace, stepRate);
  return {
    offset,
    rate: addAngles(scaleAngles(other, 1 / (toward - units)), offset, -1 / (toward - units)),
  };
}

function stanceEdges(pace: PaceId, stepRate: number): StanceEdges {
  const key = `${pace}|${stepRate}`;
  const cached = edgeCache.get(key);
  if (cached) return cached;
  const toeOff = GAIT_DATA[pace].toeOffUnits;
  const found = {
    landing: handover(0, RATE_SPAN_UNITS, pace, stepRate),
    leaving: handover(toeOff, toeOff - RATE_SPAN_UNITS, pace, stepRate),
  };
  edgeCache.set(key, found);
  return found;
}

export function solveLeg(reading: GaitReading, side: SideId, pelvis: PelvisState): LegSolution {
  const unitsOfLeg = legUnits(reading.units, side);
  if (!inStance(unitsOfLeg, reading.pace)) {
    const swing = swingLeg(
      reading,
      side,
      pelvis,
      unitsOfLeg,
      stanceEdges(reading.pace, reading.stepRate),
    );
    return { chain: swing.chain, angles: swing.angles, planted: false };
  }
  const wanted = targetAngles(
    reading,
    side,
    touchdownFor(reading.pace, reading.stepRate).abductionRad,
  );
  const planted = plantedLeg(reading, side, pelvis, wanted, legChain(pelvis, side, wanted));
  return { chain: planted.chain, angles: planted.angles, planted: true };
}

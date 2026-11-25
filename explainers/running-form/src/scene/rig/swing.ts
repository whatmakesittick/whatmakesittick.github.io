import { smoothstep } from '@core/math';
import type { GaitReading, SideId } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS } from '../../model/timeMap';
import { lowestSole } from './foot';
import { addAngles, closeLeg, kneePole, legChain, targetAngles } from './leg';
import { touchdownFor } from './touchdown';
import type { LegAngles, LegChain } from './leg';
import type { PelvisState } from './pelvis';

export const SWING = {
  clearanceM: 0.0152,
  clearAfterUnits: 45,
  clearBeforeUnits: 40,
  softnessM: 0.003,
  recoverUnits: 150,
  approachUnits: 120,
  rateUnits: 40,
  approachRateUnits: 20,
  liftInUnits: 20,
  liftOutUnits: 20,
} as const;

export interface Handover {
  readonly offset: LegAngles;
  readonly rate: LegAngles;
}

export interface StanceEdges {
  readonly landing: Handover;
  readonly leaving: Handover;
}

interface SwingLeg {
  readonly chain: LegChain;
  readonly angles: LegAngles;
  readonly liftM: number;
}

function clearance(unitsOfLeg: number, toeOffUnits: number): number {
  return (
    SWING.clearanceM *
    smoothstep(unitsOfLeg, toeOffUnits, toeOffUnits + SWING.clearAfterUnits) *
    (1 - smoothstep(unitsOfLeg, CYCLE_UNITS - SWING.clearBeforeUnits, CYCLE_UNITS))
  );
}

function liftWeight(unitsOfLeg: number, toeOffUnits: number): number {
  return (
    smoothstep(unitsOfLeg, toeOffUnits, toeOffUnits + SWING.liftInUnits) *
    (1 - smoothstep(unitsOfLeg, CYCLE_UNITS - SWING.liftOutUnits, CYCLE_UNITS))
  );
}

function softMax(value: number, floor: number): number {
  const gap = value - floor;
  return (value + floor + Math.sqrt(gap * gap + SWING.softnessM * SWING.softnessM)) / 2;
}

function withHandover(
  angles: LegAngles,
  edge: Handover,
  unitsFromEdge: number,
  span: number,
  rateSpan: number,
): LegAngles {
  const distance = Math.abs(unitsFromEdge);
  const share = 1 - smoothstep(distance, 0, span);
  const rateShare = 1 - smoothstep(distance, 0, rateSpan);
  return addAngles(addAngles(angles, edge.offset, share), edge.rate, rateShare * unitsFromEdge);
}

export function swingLeg(
  reading: GaitReading,
  side: SideId,
  pelvis: PelvisState,
  unitsOfLeg: number,
  edges: StanceEdges,
): SwingLeg {
  const { toeOffUnits } = GAIT_DATA[reading.pace];
  const data = targetAngles(
    reading,
    side,
    touchdownFor(reading.pace, reading.stepRate).abductionRad,
  );
  const angles = withHandover(
    withHandover(
      data,
      edges.leaving,
      unitsOfLeg - toeOffUnits,
      SWING.recoverUnits,
      SWING.rateUnits,
    ),
    edges.landing,
    unitsOfLeg - CYCLE_UNITS,
    SWING.approachUnits,
    SWING.approachRateUnits,
  );
  const chain = legChain(pelvis, side, angles);
  const lowest = lowestSole(chain.ankle, chain.foot, chain.toe, side).y;
  const floor = clearance(unitsOfLeg, toeOffUnits);
  const liftM = (softMax(lowest, floor) - lowest) * liftWeight(unitsOfLeg, toeOffUnits);
  const ankle = chain.ankle.clone().setY(chain.ankle.y + liftM);
  const closed = closeLeg(pelvis, side, ankle, kneePole(chain), chain.foot, chain.toe);
  return { ...closed, liftM };
}

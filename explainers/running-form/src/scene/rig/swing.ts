import { smoothstep } from '@core/math';
import type { GaitReading, SideId } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS } from '../../model/timeMap';
import { lowestSole, toeBendFor } from './foot';
import { closeLeg, footPitch, kneePole, legChain, targetAngles } from './leg';
import { touchdownFor } from './touchdown';
import type { LegAngles, LegChain } from './leg';
import type { PelvisState } from './pelvis';

export const SWING = {
  clearanceM: 0.018,
  clearAfterUnits: 30,
  clearBeforeUnits: 40,
  softnessM: 0.012,
  toeRelaxUnits: 70,
  leaveBlendUnits: 14,
} as const;

export interface SwingLeg {
  readonly chain: LegChain;
  readonly angles: LegAngles;
  readonly liftM: number;
}

function clearance(unitsOfLeg: number, toeOffUnits: number): number | null {
  if (unitsOfLeg < toeOffUnits - SWING.leaveBlendUnits) return null;
  return (
    SWING.clearanceM *
    smoothstep(unitsOfLeg, toeOffUnits, toeOffUnits + SWING.clearAfterUnits) *
    (1 - smoothstep(unitsOfLeg, CYCLE_UNITS - SWING.clearBeforeUnits, CYCLE_UNITS))
  );
}

function softMax(value: number, floor: number): number {
  const gap = value - floor;
  return (value + floor + Math.sqrt(gap * gap + SWING.softnessM * SWING.softnessM)) / 2;
}

function toeFade(unitsOfLeg: number, toeOffUnits: number): number {
  if (unitsOfLeg < toeOffUnits) return 1;
  return 1 - smoothstep(unitsOfLeg, toeOffUnits, toeOffUnits + SWING.toeRelaxUnits);
}

export function swingLeg(
  reading: GaitReading,
  side: SideId,
  pelvis: PelvisState,
  unitsOfLeg: number,
): SwingLeg {
  const { toeOffUnits } = GAIT_DATA[reading.pace];
  const data = targetAngles(
    reading,
    side,
    touchdownFor(reading.pace, reading.stepRate).abductionRad,
  );
  const bare = legChain(pelvis, side, data);
  const toe = toeBendFor(footPitch(bare.foot)) * toeFade(unitsOfLeg, toeOffUnits);
  const angles = { ...data, toe };
  const chain = legChain(pelvis, side, angles);
  const lowest = lowestSole(chain.ankle, chain.foot, chain.toe, side).y;
  const floor = clearance(unitsOfLeg, toeOffUnits);
  if (floor === null) return { chain, angles, liftM: 0 };
  const liftM = softMax(lowest, floor) - lowest;
  const ankle = chain.ankle.clone().setY(chain.ankle.y + liftM);
  const closed = closeLeg(pelvis, side, ankle, kneePole(chain), chain.foot, toe);
  return { ...closed, liftM };
}

import { Vector3 } from 'three';
import type { PaceId } from '../../ids';
import { gaitAt } from '../../model/gait';
import { plantFoot } from './foot';
import { solveTwoBone } from '@core/rig/ik';
import { RIG_BODY } from './body';
import { footPitch, footYaw, kneePole, legChain, targetAngles } from './leg';
import { pelvisAt } from './pelvis';

export interface Touchdown {
  readonly hipHeightM: number;
  readonly contact: Vector3;
  readonly along: number;
  readonly yaw: number;
  readonly abductionRad: number;
}

export const FOOT_LINE_M = 0.045;
export const HIP_LIFT_M: Readonly<Record<PaceId, number>> = {
  easy: 0.028,
  steady: 0.04,
  fast: 0.05,
};

const ABDUCTION_PROBE_RAD = 0.05;
const PITCH_PASSES = 3;
const ABDUCTION_STEPS = 3;
const touchdowns = new Map<string, Touchdown>();

function shankAngle(knee: Vector3, ankle: Vector3): number {
  return Math.atan2(ankle.x - knee.x, knee.y - ankle.y);
}

function abductionFor(pace: PaceId, stepRate: number): number {
  const reading = gaitAt(0, { pace, stepRate, arms: 'swing' });
  const pelvis = pelvisAt(reading, 0);
  const lineAt = (abduction: number) =>
    legChain(pelvis, 'right', targetAngles(reading, 'right', abduction)).ankle.z;
  let abduction = 0;
  for (let step = 0; step < ABDUCTION_STEPS; step += 1) {
    const here = lineAt(abduction);
    const slope = (lineAt(abduction + ABDUCTION_PROBE_RAD) - here) / ABDUCTION_PROBE_RAD;
    abduction += (FOOT_LINE_M - here) / slope;
  }
  return abduction;
}

export function touchdownOf(pace: PaceId, stepRate: number, liftM: number): Touchdown {
  const abductionRad = abductionFor(pace, stepRate);
  const reading = gaitAt(0, { pace, stepRate, arms: 'swing' });
  const pelvis = pelvisAt(reading, 0);
  const chain = legChain(pelvis, 'right', targetAngles(reading, 'right', abductionRad));
  const yaw = footYaw(chain.foot);
  const dataPitch = footPitch(chain.foot);
  const dataShank = shankAngle(chain.knee, chain.ankle);
  const touchHeight = plantFoot(yaw, dataPitch).offset.y - chain.ankle.y;
  const hipHeightM = touchHeight + liftM;
  const hip = chain.hip.clone().setY(chain.hip.y + hipHeightM);
  const reach = chain.ankle.distanceTo(chain.hip);
  const pole = kneePole(chain);
  let planted = plantFoot(yaw, dataPitch);
  let ankle = chain.ankle.clone();
  for (let pass = 0; pass < PITCH_PASSES; pass += 1) {
    const drop = hip.y - planted.offset.y;
    const across = chain.ankle.z - hip.z;
    const ahead = Math.sqrt(Math.max(reach * reach - drop * drop - across * across, 0));
    ankle = new Vector3(hip.x + ahead, planted.offset.y, chain.ankle.z);
    const knee = solveTwoBone(hip, ankle, RIG_BODY.thighM, RIG_BODY.shankM, pole, new Vector3());
    planted = plantFoot(yaw, dataPitch + shankAngle(knee, ankle) - dataShank);
  }
  return {
    hipHeightM,
    contact: ankle.sub(planted.offset).setY(0),
    along: planted.along,
    yaw,
    abductionRad,
  };
}

export function touchdownFor(pace: PaceId, stepRate: number): Touchdown {
  const key = `${pace}|${stepRate}`;
  const cached = touchdowns.get(key);
  if (cached) return cached;
  const found = touchdownOf(pace, stepRate, HIP_LIFT_M[pace]);
  touchdowns.set(key, found);
  return found;
}

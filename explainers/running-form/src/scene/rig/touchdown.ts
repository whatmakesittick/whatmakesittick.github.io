import type { Vector3 } from 'three';
import type { PaceId } from '../../ids';
import { gaitAt } from '../../model/gait';
import { plantFoot } from './foot';
import { footPitch, footYaw, legChain, targetAngles } from './leg';
import { pelvisAt } from './pelvis';

interface Touchdown {
  readonly hipHeightM: number;
  readonly contact: Vector3;
  readonly along: number;
  readonly yaw: number;
  readonly abductionRad: number;
}

const FOOT_LINE_M = 0.045;

const ABDUCTION_PROBE_RAD = 0.05;
const ABDUCTION_STEPS = 3;
const touchdowns = new Map<string, Touchdown>();

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

function touchdownOf(pace: PaceId, stepRate: number): Touchdown {
  const abductionRad = abductionFor(pace, stepRate);
  const reading = gaitAt(0, { pace, stepRate, arms: 'swing' });
  const chain = legChain(
    pelvisAt(reading, 0),
    'right',
    targetAngles(reading, 'right', abductionRad),
  );
  const yaw = footYaw(chain.foot);
  const planted = plantFoot(yaw, footPitch(chain.foot));
  const hipHeightM = planted.offset.y - chain.ankle.y;
  return {
    hipHeightM,
    contact: chain.ankle.clone().sub(planted.offset).setY(0),
    along: planted.along,
    yaw,
    abductionRad,
  };
}

export function touchdownFor(pace: PaceId, stepRate: number): Touchdown {
  const key = `${pace}|${stepRate}`;
  const cached = touchdowns.get(key);
  if (cached) return cached;
  const found = touchdownOf(pace, stepRate);
  touchdowns.set(key, found);
  return found;
}

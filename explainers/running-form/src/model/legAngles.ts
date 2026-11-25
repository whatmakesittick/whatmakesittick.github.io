import type { PaceId } from '../ids';
import { FULL_TURN } from '@core/math';
import { GAIT_DATA } from './gaitData';
import type { FourierFit } from './gaitData';
import { stepRateEffect } from './stepRate';
import { CYCLE_UNITS, unitsDelta, wrapUnits } from './playback';

export interface LegAngles {
  hipFlexDeg: number;
  hipAddDeg: number;
  hipRotDeg: number;
  kneeFlexDeg: number;
  kneeAddDeg: number;
  kneeRotDeg: number;
  ankleDorsiDeg: number;
  ankleInvDeg: number;
  ankleRotDeg: number;
}

const KNEE_LAND_HALF_UNITS = 60;
const KNEE_PEAK_HALF_UNITS = 120;
const HIP_PEAK_CENTRE_UNITS = 50;
const HIP_PEAK_HALF_UNITS = 80;

export function evaluateFit(fit: FourierFit, units: number): number {
  const share = wrapUnits(units) / CYCLE_UNITS;
  let value = fit.a0;
  for (let k = 0; k < fit.cos.length; k += 1) {
    const angle = FULL_TURN * (k + 1) * share;
    value += fit.cos[k] * Math.cos(angle) + fit.sin[k] * Math.sin(angle);
  }
  return value;
}

function raisedCosine(units: number, centre: number, half: number): number {
  const distance = Math.abs(unitsDelta(centre, units));
  return distance >= half ? 0 : 0.5 * (1 + Math.cos((Math.PI * distance) / half));
}

export function legAnglesAt(units: number, pace: PaceId, stepRate: number): LegAngles {
  const { angles, stanceKneePeakUnits } = GAIT_DATA[pace];
  const effect = stepRateEffect(stepRate);
  const kneeWindow =
    effect.kneeLandDeg * raisedCosine(units, 0, KNEE_LAND_HALF_UNITS) +
    effect.kneePeakDeg * raisedCosine(units, stanceKneePeakUnits, KNEE_PEAK_HALF_UNITS);
  const hipWindow =
    effect.hipPeakDeg * raisedCosine(units, HIP_PEAK_CENTRE_UNITS, HIP_PEAK_HALF_UNITS);
  return {
    hipFlexDeg: evaluateFit(angles.hipFlex, units) + hipWindow,
    hipAddDeg: evaluateFit(angles.hipAdd, units),
    hipRotDeg: evaluateFit(angles.hipRot, units),
    kneeFlexDeg: evaluateFit(angles.kneeFlex, units) + kneeWindow,
    kneeAddDeg: evaluateFit(angles.kneeAdd, units),
    kneeRotDeg: evaluateFit(angles.kneeRot, units),
    ankleDorsiDeg: evaluateFit(angles.ankleDorsi, units),
    ankleInvDeg: evaluateFit(angles.ankleInv, units),
    ankleRotDeg: evaluateFit(angles.ankleRot, units),
  };
}

import { t } from '@core/i18n';
import type { ArmsId, ForceReading, GaitReading, LegReading, PaceId } from '../ids';
import {
  GAIT_DATA,
  HELD_TWIST_GAIN,
  PACES,
  UPPER_RANGES,
  legAnglesAt,
  stepRateEffect,
} from '../model';
import { phaseKey } from '../timeline';
import { formatCentimetersSigned } from './format';

const NO_REACH_CHANGE_CM = 0.05;
const PERCENT = 100;
const FEET_KEYS = {
  right: 'gauge.feetRight',
  left: 'gauge.feetLeft',
  air: 'gauge.feetAir',
} as const;

export function feetText(force: ForceReading): string {
  return t(FEET_KEYS[force.onFoot ?? 'air']);
}

export function phaseText(leg: LegReading): string {
  return t(phaseKey(leg.phase));
}

export function reachChangeText(stepRate: number): string {
  const { reachCm } = stepRateEffect(stepRate);
  if (Math.abs(reachCm) < NO_REACH_CHANGE_CM) return t('chapters.touchdown.reachSame');
  return formatCentimetersSigned(reachCm);
}

export function touchdownKneeDeg(reading: Pick<GaitReading, 'pace' | 'stepRate'>): number {
  return legAnglesAt(0, reading.pace, reading.stepRate).kneeFlexDeg;
}

export function brakeImpulseChangePercent(stepRate: number): number {
  return (stepRateEffect(stepRate).brakingImpulseFactor - 1) * PERCENT;
}

export function peakBrakingBW(pace: PaceId, stepRate: number): number {
  const { brakingImpulseFactor } = stepRateEffect(stepRate);
  return GAIT_DATA[pace].peakBrakingBW * brakingImpulseFactor * (1 + stepRate / PERCENT);
}

export function peakVerticalBW(pace: PaceId, stepRate: number): number {
  return PACES[pace].peakForceBW * stepRateEffect(stepRate).verticalForceFactor;
}

export function trunkTwistRange(pace: PaceId, arms: ArmsId): number {
  const gain = arms === 'held' ? HELD_TWIST_GAIN : 1;
  return UPPER_RANGES[pace].trunkTwist * gain;
}

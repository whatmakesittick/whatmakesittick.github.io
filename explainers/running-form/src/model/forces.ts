import type { GroundForce, PaceId } from '../ids';
import { GAIT_DATA } from './gaitData';
import { stepRateEffect } from './stepRate';
import { CYCLE_UNITS } from './playback';

const HALF_CYCLE = CYCLE_UNITS / 2;

export const FORCE_SAMPLES = 100;
const UNITS_PER_SAMPLE = CYCLE_UNITS / FORCE_SAMPLES;
const PERCENT = 100;

function sampleAt(series: readonly number[], units: number): number {
  const position = units / UNITS_PER_SAMPLE;
  const lower = Math.floor(position) % FORCE_SAMPLES;
  const upper = (lower + 1) % FORCE_SAMPLES;
  const share = position - Math.floor(position);
  return series[lower] + (series[upper] - series[lower]) * share;
}

export function legForceAt(
  unitsOfLeg: number,
  pace: PaceId,
  stepRate: number,
  scaleVertical = true,
): GroundForce {
  const { forces, toeOffUnits } = GAIT_DATA[pace];
  if (unitsOfLeg >= toeOffUnits) return { fwdBW: 0, vertBW: 0, rightBW: 0 };
  const effect = stepRateEffect(stepRate);
  const braking = effect.brakingImpulseFactor * (1 + stepRate / PERCENT);
  const fwd = sampleAt(forces.fwd, unitsOfLeg);
  return {
    fwdBW: fwd < 0 ? fwd * braking : fwd,
    vertBW: sampleAt(forces.vert, unitsOfLeg) * (scaleVertical ? effect.verticalForceFactor : 1),
    rightBW: sampleAt(forces.right, unitsOfLeg),
  };
}

export function totalForceSamples(
  pace: PaceId,
  stepRate: number,
  scaleVertical = true,
): GroundForce[] {
  return Array.from({ length: FORCE_SAMPLES }, (_, index) => {
    const right = legForceAt(index * UNITS_PER_SAMPLE, pace, stepRate, scaleVertical);
    const left = legForceAt(
      (index * UNITS_PER_SAMPLE + HALF_CYCLE) % CYCLE_UNITS,
      pace,
      stepRate,
      scaleVertical,
    );
    return {
      fwdBW: right.fwdBW + left.fwdBW,
      vertBW: right.vertBW + left.vertBW,
      rightBW: right.rightBW + left.rightBW,
    };
  });
}

import { AIR_DENSITY, BETZ_LIMIT, CUT_IN_MS, CUT_OUT_MS, SWEPT_AREA_M2 } from './constants';
import { POWER_CURVE, THRUST_CURVE, interpolateKnots } from './curves';

const WATTS_PER_KW = 1000;

export function isGenerating(wind: number): boolean {
  return wind >= CUT_IN_MS && wind < CUT_OUT_MS;
}

export function turbinePowerKw(wind: number): number {
  return isGenerating(wind) ? interpolateKnots(POWER_CURVE, wind) : 0;
}

export function thrustCoefficient(wind: number): number {
  return isGenerating(wind) ? interpolateKnots(THRUST_CURVE, wind) : 0;
}

export function windPowerKw(wind: number): number {
  return (0.5 * AIR_DENSITY * SWEPT_AREA_M2 * wind ** 3) / WATTS_PER_KW;
}

export function powerCoefficient(wind: number): number {
  const power = turbinePowerKw(wind);
  return power > 0 ? power / windPowerKw(wind) : 0;
}

export function betzShare(wind: number): number {
  return powerCoefficient(wind) / BETZ_LIMIT;
}

import { lerp, smoothstep } from '@core/math';
import { CRUISE_POWER_FACTOR, CRUISE_TILT_DEG, HOVER_POWER_REF } from './figures';
import { SPEED_KMH } from './layout';
import { thrustShareAt } from './tilt';

const INDUCED_POWER_EXPONENT = 1.5;

export function forwardFactor(speedKmh: number): number {
  return lerp(1, CRUISE_POWER_FACTOR, smoothstep(speedKmh, 0, SPEED_KMH.cruise));
}

export function powerAt(thrustG: number, speedKmh: number): number {
  const ratio = Math.max(0, thrustG) / HOVER_POWER_REF.allUpG;
  return HOVER_POWER_REF.watts * ratio ** INDUCED_POWER_EXPONENT * forwardFactor(speedKmh);
}

export function hoverPowerW(allUpG: number): number {
  return powerAt(allUpG, 0);
}

export function cruisePowerW(allUpG: number): number {
  return powerAt(allUpG * thrustShareAt(CRUISE_TILT_DEG), SPEED_KMH.cruise);
}

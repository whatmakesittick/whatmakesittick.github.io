import {
  MASS_G,
  MIN_THRUST_TO_WEIGHT,
  MOTOR_COUNT,
  PACK,
  THRUST_PER_MOTOR_G,
  USABLE_ENERGY_SHARE,
} from './figures';
import { cruisePowerW } from './power';
import { MINUTES_PER_HOUR } from './sortie';

export const PAYLOAD_RANGE = {
  min: 0,
  max: MASS_G.maxPayload,
  step: 50,
  default: MASS_G.defaultPayload,
} as const;

const MAX_THRUST_G = MOTOR_COUNT * THRUST_PER_MOTOR_G.flight;

export const USABLE_ENERGY_WH = USABLE_ENERGY_SHARE * PACK.energyWh;

export function allUpG(payloadG: number): number {
  return MASS_G.dry + MASS_G.battery + payloadG;
}

export function thrustToWeight(payloadG: number): number {
  return MAX_THRUST_G / allUpG(payloadG);
}

export function hoverThrustShare(payloadG: number): number {
  return 1 / thrustToWeight(payloadG);
}

export function hoverSpeedShare(payloadG: number): number {
  return Math.sqrt(hoverThrustShare(payloadG));
}

export function flightMinutes(payloadG: number): number {
  if (thrustToWeight(payloadG) < MIN_THRUST_TO_WEIGHT) return 0;
  return (USABLE_ENERGY_WH / cruisePowerW(allUpG(payloadG))) * MINUTES_PER_HOUR;
}

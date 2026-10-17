import type { GasId } from '../ids';
import {
  EXHAUST_SPEED_MS,
  FILL_POWER_KW,
  FULL_COMPRESSIBILITY,
  G,
  GAS_DENSITY_KG_M3,
  PRESSURE_EXPONENT,
  TANK_PRESSURE_BAR,
  TANK_SHELL_KG_PER_L,
  WORK_PER_KG_KJ,
} from './constants';

export const LITRES_PER_CUBIC_METRE = 1000;
export const KJ_PER_MJ = 1000;
export const SECONDS_PER_MINUTE = 60;

export function exhaustSpeed(gas: GasId): number {
  return EXHAUST_SPEED_MS[gas];
}

export function storedMass(gas: GasId, litres: number): number {
  return (GAS_DENSITY_KG_M3[gas] * litres) / LITRES_PER_CUBIC_METRE;
}

export function storedWorkMj(gas: GasId, litres: number): number {
  return (WORK_PER_KG_KJ[gas] * storedMass(gas, litres)) / KJ_PER_MJ;
}

export function tankShellKg(litres: number): number {
  return TANK_SHELL_KG_PER_L * litres;
}

export function massFlow(thrustN: number, gas: GasId): number {
  return thrustN / exhaustSpeed(gas);
}

export function thrust(massFlowKgS: number, gas: GasId): number {
  return massFlowKgS * exhaustSpeed(gas);
}

export function isp(gas: GasId): number {
  return exhaustSpeed(gas) / G;
}

export function fillMinutes(gas: GasId, litres: number, share: number): number {
  return (storedWorkMj(gas, litres) * share * KJ_PER_MJ) / FILL_POWER_KW / SECONDS_PER_MINUTE;
}

export function pressureAt(massShare: number): number {
  return TANK_PRESSURE_BAR * massShare ** PRESSURE_EXPONENT;
}

export function fillPressureAt(massShare: number): number {
  const idealPressure = (TANK_PRESSURE_BAR / FULL_COMPRESSIBILITY) * massShare;
  return idealPressure * (1 + (FULL_COMPRESSIBILITY - 1) * massShare ** 2);
}

export function shareAtPressure(pressureBar: number): number {
  return (pressureBar / TANK_PRESSURE_BAR) ** (1 / PRESSURE_EXPONENT);
}

export function nozzleAt(pressureBar: number, ratedN: number): number {
  return (ratedN * pressureBar) / TANK_PRESSURE_BAR;
}

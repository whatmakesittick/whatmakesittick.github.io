import type { GasId } from '../ids';
import { CAR_MASS_KG, G } from './constants';
import { exhaustSpeed, storedMass } from './gas';

const WATTS_PER_MEGAWATT = 1e6;
const NEWTONS_PER_KILONEWTON = 1000;

export function weightN(): number {
  return CAR_MASS_KG * G;
}

export function hoverFlow(gas: GasId): number {
  return weightN() / exhaustSpeed(gas);
}

export function hoverSeconds(gas: GasId, litres: number): number {
  return storedMass(gas, litres) / hoverFlow(gas);
}

export function jetPowerMw(gas: GasId): number {
  return (0.5 * weightN() * exhaustSpeed(gas)) / WATTS_PER_MEGAWATT;
}

export function totalImpulseKns(gas: GasId, litres: number): number {
  return (storedMass(gas, litres) * exhaustSpeed(gas)) / NEWTONS_PER_KILONEWTON;
}

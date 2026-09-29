import type { PropellantId } from '../ids';
import { methaneFlow, oxygenFlow } from './performance';

export interface Propellant {
  boilsAtK: number;
  freezesAtK: number;
  massShare: number;
}

export const KELVIN_OFFSET = 273.15;

export const PROPELLANTS: Readonly<Record<PropellantId, Propellant>> = {
  methane: { boilsAtK: 111, freezesAtK: 90.7, massShare: 0.22 },
  oxygen: { boilsAtK: 90, freezesAtK: 54, massShare: 0.78 },
};

export function toCelsius(kelvin: number): number {
  return kelvin - KELVIN_OFFSET;
}

export function propellantFlow(propellant: PropellantId, throttle: number): number {
  return propellant === 'methane' ? methaneFlow(throttle) : oxygenFlow(throttle);
}

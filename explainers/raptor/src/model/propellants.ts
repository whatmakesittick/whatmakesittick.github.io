import type { PropellantId } from '../ids';
import { MIXTURE_RATIO, methaneFlow, oxygenFlow } from './performance';

export interface Propellant {
  boilsAtK: number;
  freezesAtK: number;
  massShare: number;
}

export const KELVIN_OFFSET = 273.15;

const MIXTURE_PARTS = MIXTURE_RATIO + 1;

export const PROPELLANTS: Readonly<Record<PropellantId, Propellant>> = {
  methane: { boilsAtK: 111, freezesAtK: 90.7, massShare: 1 / MIXTURE_PARTS },
  oxygen: { boilsAtK: 90, freezesAtK: 54, massShare: MIXTURE_RATIO / MIXTURE_PARTS },
};

export function toCelsius(kelvin: number): number {
  return kelvin - KELVIN_OFFSET;
}

export function propellantFlow(propellant: PropellantId, throttle: number): number {
  return propellant === 'methane' ? methaneFlow(throttle) : oxygenFlow(throttle);
}

import type { RingId } from '../ids';
import { ATP_PER_TURN, BLADE_COUNTS, protonsPerAtp } from './rotor';

export interface RingFacts {
  readonly blades: number;
  readonly protonsPerAtp: number;
  readonly atpPerHundredProtons: number;
}

export const REFERENCE_PROTONS = 100;

const TENTHS = 10;

function toTenths(value: number): number {
  return Math.round(value * TENTHS) / TENTHS;
}

export function ringFacts(ring: RingId): RingFacts {
  const blades = BLADE_COUNTS[ring];
  return {
    blades,
    protonsPerAtp: toTenths(protonsPerAtp(blades)),
    atpPerHundredProtons: toTenths((REFERENCE_PROTONS * ATP_PER_TURN) / blades),
  };
}

import type { FieldId, Fringe } from '../ids';
import {
  BODY_K,
  BOLTZMANN,
  DISPLAY_TURNS_PER_S,
  EARTH_UT,
  GAMMA_MHZ_PER_T,
  HYDROGEN_PER_MM3,
  HZ_PER_MHZ,
  PLANCK,
  TESLA_PER_UT,
} from './constants';

export interface FieldSpec {
  tesla: number;
  fringe: Fringe;
}

export interface EarthMultiple {
  min: number;
  typical: number;
  max: number;
}

export const FIELDS: Readonly<Record<FieldId, FieldSpec>> = {
  field15: { tesla: 1.5, fringe: { along: 4.0, side: 2.5 } },
  field30: { tesla: 3, fringe: { along: 5.2, side: 2.8 } },
};

export function larmorMHz(field: FieldId): number {
  return GAMMA_MHZ_PER_T * FIELDS[field].tesla;
}

export function larmorHz(field: FieldId): number {
  return larmorMHz(field) * HZ_PER_MHZ;
}

export function spinSurplus(field: FieldId): number {
  return (PLANCK * larmorHz(field)) / (2 * BOLTZMANN * BODY_K);
}

export function surplusPerMm3(field: FieldId): number {
  return HYDROGEN_PER_MM3 * spinSurplus(field);
}

export function earthMultiple(field: FieldId): EarthMultiple {
  const times = (microtesla: number): number => FIELDS[field].tesla / (microtesla * TESLA_PER_UT);
  return { min: times(EARTH_UT.max), typical: times(EARTH_UT.typical), max: times(EARTH_UT.min) };
}

export function slowdown(field: FieldId): number {
  return larmorHz(field) / DISPLAY_TURNS_PER_S;
}

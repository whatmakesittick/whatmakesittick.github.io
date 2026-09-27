import { clamp } from '@core/math';
import { OBJECTIVES } from './objectives';
import type { ObjectiveId } from './objectives';

export const WAVELENGTH = { min: 400, max: 700, step: 10, default: 550 } as const;
export const USEFUL_MAGNIFICATION_PER_APERTURE = { min: 500, max: 1000 } as const;

const NANOMETRES_PER_MICROMETRE = 1000;
const RAYLEIGH_FACTOR = 0.61;

export interface MagnificationRange {
  min: number;
  max: number;
}

export function clampWavelength(nanometres: number): number {
  return clamp(nanometres, WAVELENGTH.min, WAVELENGTH.max);
}

export function abbeLimit(wavelength: number, aperture: number): number {
  return wavelength / (2 * aperture) / NANOMETRES_PER_MICROMETRE;
}

export function rayleighLimit(wavelength: number, aperture: number): number {
  return (RAYLEIGH_FACTOR * wavelength) / aperture / NANOMETRES_PER_MICROMETRE;
}

export function usefulMagnification(aperture: number): MagnificationRange {
  return {
    min: USEFUL_MAGNIFICATION_PER_APERTURE.min * aperture,
    max: USEFUL_MAGNIFICATION_PER_APERTURE.max * aperture,
  };
}

export function smallestDetail(objective: ObjectiveId, wavelength: number): number {
  return abbeLimit(wavelength, OBJECTIVES[objective].numericalAperture);
}

import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from './objectives';
import {
  WAVELENGTH,
  abbeLimit,
  clampWavelength,
  rayleighLimit,
  smallestDetail,
  usefulMagnification,
} from './resolution';

describe('resolution', () => {
  it('resolves the published Abbe limits at 550 nm', () => {
    expect(smallestDetail('x4', 550)).toBeCloseTo(2.75, 2);
    expect(smallestDetail('x10', 550)).toBeCloseTo(1.1, 2);
    expect(smallestDetail('x40', 550)).toBeCloseTo(0.42, 2);
    expect(smallestDetail('x100', 550)).toBeCloseTo(0.22, 2);
  });

  it('gives the Rayleigh values the Olympus manual prints', () => {
    const rayleigh = (aperture: number) => rayleighLimit(550, aperture);
    expect(rayleigh(OBJECTIVES.x4.numericalAperture)).toBeCloseTo(3.36, 2);
    expect(rayleigh(OBJECTIVES.x10.numericalAperture)).toBeCloseTo(1.34, 2);
    expect(rayleigh(OBJECTIVES.x40.numericalAperture)).toBeCloseTo(0.52, 2);
    expect(rayleigh(OBJECTIVES.x100.numericalAperture)).toBeCloseTo(0.27, 2);
  });

  it('shows finer detail in shorter waves', () => {
    expect(abbeLimit(400, 1.25)).toBeCloseTo(0.16, 2);
    expect(abbeLimit(700, 1.25)).toBeCloseTo(0.28, 2);
  });

  it('keeps useful magnification between 500 and 1000 times the aperture', () => {
    expect(usefulMagnification(0.65)).toEqual({ min: 325, max: 650 });
    expect(usefulMagnification(1.25)).toEqual({ min: 625, max: 1250 });
  });

  it('keeps the wavelength within visible light', () => {
    expect(WAVELENGTH).toEqual({ min: 400, max: 700, step: 10, default: 550 });
    expect(clampWavelength(300)).toBe(400);
    expect(clampWavelength(800)).toBe(700);
    expect(clampWavelength(480)).toBe(480);
  });
});

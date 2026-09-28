import { CELL, STANDARD_TEST } from './module';
import { BAND_GAP_NM, SPECTRUM_SHARES, pairsPerSecond, passesThrough } from './optics';

export function usableShare(): number {
  return SPECTRUM_SHARES.usable;
}

export function belowGapShare(): number {
  return SPECTRUM_SHARES.belowGap;
}

export function thermalisedShare(): number {
  return SPECTRUM_SHARES.thermalised;
}

export function keptShareOfPhoton(wavelengthNm: number): number {
  return passesThrough(wavelengthNm) ? 0 : wavelengthNm / BAND_GAP_NM;
}

export function pairsPerSecondPerHalfCell(irradiance: number): number {
  const current = (CELL.halfIscA * Math.max(0, irradiance)) / STANDARD_TEST.irradiance;
  return pairsPerSecond(current);
}

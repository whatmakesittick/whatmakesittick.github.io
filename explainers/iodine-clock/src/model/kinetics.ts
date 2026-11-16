import { clamp } from '@core/math';
import { BISULFITE_START_M } from './recipe';

export const AUTOCATALYSIS_SHAPE = 3;
export const IODINE_PER_BISULFITE = 1 / 5;
export const I2_FINAL_M = BISULFITE_START_M * IODINE_PER_BISULFITE;
export const IODINE_RISE_S = 0.1;
export const K_IODINE_BISULFITE = 1.8e9;
export const VISIBLE_IODINE_M = 2e-5;
export const COLOUR_EXPONENT = 0.5;
export const LIFETIME_SURVIVES_S = 1e-3;

const BISULFITE_PER_IODIDE = 3;
const IODIDE_PER_IODINE = 5 / 3;
const IODATE_PER_IODINE = 1 / 3;
const ACID_PER_IODINE = 2;

export function bisulfiteAt(seconds: number, switchAt: number): number {
  if (seconds >= switchAt) return 0;
  const share = clamp(seconds / switchAt, 0, 1);
  const used = Math.expm1(AUTOCATALYSIS_SHAPE * share) / Math.expm1(AUTOCATALYSIS_SHAPE);
  return BISULFITE_START_M * (1 - used);
}

function bisulfiteUsed(seconds: number, switchAt: number): number {
  return BISULFITE_START_M - bisulfiteAt(seconds, switchAt);
}

export function iodineAt(seconds: number, switchAt: number): number {
  if (seconds < switchAt) return 0;
  return I2_FINAL_M * -Math.expm1(-(seconds - switchAt) / IODINE_RISE_S);
}

export function iodideAt(seconds: number, switchAt: number): number {
  const made = bisulfiteUsed(seconds, switchAt) / BISULFITE_PER_IODIDE;
  return Math.max(0, made - IODIDE_PER_IODINE * iodineAt(seconds, switchAt));
}

export function iodateAt(seconds: number, switchAt: number, iodateStartM: number): number {
  const landolt = bisulfiteUsed(seconds, switchAt) / BISULFITE_PER_IODIDE;
  return iodateStartM - landolt - IODATE_PER_IODINE * iodineAt(seconds, switchAt);
}

export function sulfateAt(seconds: number, switchAt: number): number {
  return bisulfiteUsed(seconds, switchAt);
}

export function acidAt(seconds: number, switchAt: number): number {
  return bisulfiteUsed(seconds, switchAt) - ACID_PER_IODINE * iodineAt(seconds, switchAt);
}

export function iodineLifetime(bisulfiteM: number): number {
  return bisulfiteM > 0 ? 1 / (K_IODINE_BISULFITE * bisulfiteM) : Infinity;
}

export function colourDepth(iodineM: number): number {
  if (iodineM < VISIBLE_IODINE_M) return 0;
  return Math.min(1, (iodineM / I2_FINAL_M) ** COLOUR_EXPONENT);
}

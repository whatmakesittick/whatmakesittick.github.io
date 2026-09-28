import { clamp } from '@core/math';
import type { MudState } from '../ids';
import { ROCKS, poreDensityAt } from './rocks';
import {
  DRILL_FLOOR_ABOVE_SEA_M,
  LAYERS,
  SEABED_DEPTH_M,
  WATER_DEPTH_M,
  depthBelowSeabed,
  riserLanded,
} from './wellPlan';

export const BAR_PER_METRE_PER_DENSITY = 0.0981;
export const SEAWATER_DENSITY = 1.025;
export const MATRIX_STRESS_COEFFICIENT = 0.5;
export const BALANCE_TOLERANCE_BAR = 0.05;

export interface MudWindow {
  pore: number;
  fracture: number;
}

export function hydrostaticBar(density: number, heightM: number): number {
  return density * BAR_PER_METRE_PER_DENSITY * heightM;
}

export function seaPressureBar(depthBelowSea: number): number {
  return hydrostaticBar(SEAWATER_DENSITY, Math.max(0, depthBelowSea));
}

export const SEABED_PRESSURE_BAR = seaPressureBar(WATER_DEPTH_M);

function depthBelowSea(depth: number): number {
  return depth - DRILL_FLOOR_ABOVE_SEA_M;
}

export function isInRock(depth: number): boolean {
  return depth >= SEABED_DEPTH_M;
}

export function whenInRock<T>(depth: number, measure: (depth: number) => T): T | null {
  return isInRock(depth) ? measure(depth) : null;
}

export function porePressureBar(depth: number): number {
  if (!isInRock(depth)) return seaPressureBar(depthBelowSea(depth));
  return SEABED_PRESSURE_BAR + hydrostaticBar(poreDensityAt(depth), depthBelowSeabed(depth));
}

export function overburdenBar(depth: number): number {
  if (!isInRock(depth)) return seaPressureBar(depthBelowSea(depth));
  let pressure = SEABED_PRESSURE_BAR;
  for (const layer of LAYERS) {
    const thickness = clamp(depth - layer.top, 0, layer.bottom - layer.top);
    pressure += hydrostaticBar(ROCKS[layer.id].bulkDensity, thickness);
  }
  return pressure;
}

export function fracturePressureBar(depth: number): number {
  const pore = porePressureBar(depth);
  return pore + MATRIX_STRESS_COEFFICIENT * (overburdenBar(depth) - pore);
}

export function mudColumnBar(depth: number, mudWeight: number, withRiser: boolean): number {
  if (withRiser) return hydrostaticBar(mudWeight, depth);
  if (!isInRock(depth)) return seaPressureBar(depthBelowSea(depth));
  return SEABED_PRESSURE_BAR + hydrostaticBar(mudWeight, depthBelowSeabed(depth));
}

export function mudPressureBar(bitDepth: number, mudWeight: number): number {
  return mudColumnBar(bitDepth, mudWeight, riserLanded(bitDepth));
}

export function equivalentDensity(pressureBar: number, depth: number): number {
  return pressureBar / hydrostaticBar(1, depth);
}

export function mudWindow(depth: number): MudWindow {
  return {
    pore: equivalentDensity(porePressureBar(depth), depth),
    fracture: equivalentDensity(fracturePressureBar(depth), depth),
  };
}

export function mudState(bitDepth: number, mudWeight: number): MudState {
  if (!isInRock(bitDepth)) return 'safe';
  const mud = mudPressureBar(bitDepth, mudWeight);
  if (mud < porePressureBar(bitDepth) - BALANCE_TOLERANCE_BAR) return 'light';
  if (mud > fracturePressureBar(bitDepth)) return 'heavy';
  return 'safe';
}

export function mudWindowShare(bitDepth: number, mudWeight: number): number {
  const pore = porePressureBar(bitDepth);
  const room = fracturePressureBar(bitDepth) - pore;
  if (room <= 0) return 0;
  return clamp((mudPressureBar(bitDepth, mudWeight) - pore) / room, 0, 1);
}

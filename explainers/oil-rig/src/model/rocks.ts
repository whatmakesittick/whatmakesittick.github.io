import { lerp } from '@core/math';
import type { FluidId, LayerId } from '../ids';
import { LAYERS, RESERVOIR_FLUIDS, fluidAt, layerAt } from './wellPlan';
import type { FluidLeg, Layer } from './wellPlan';

export const SEAWATER_PORE_DENSITY = 1.03;
export const BRINE_DENSITY = 1.07;
export const OVERPRESSURE_DENSITY = 1.32;

export interface PoreDensity {
  top: number;
  base: number;
}

export interface Rock {
  poreDensity: PoreDensity;
  bulkDensity: number;
  porosity: number;
  fluid: FluidId;
}

function uniform(density: number): PoreDensity {
  return { top: density, base: density };
}

export const ROCKS: Record<LayerId, Rock> = {
  seabed: {
    poreDensity: uniform(SEAWATER_PORE_DENSITY),
    bulkDensity: 1.7,
    porosity: 0.45,
    fluid: 'water',
  },
  claystone: {
    poreDensity: uniform(BRINE_DENSITY),
    bulkDensity: 2.1,
    porosity: 0.3,
    fluid: 'water',
  },
  aquifer: {
    poreDensity: uniform(BRINE_DENSITY),
    bulkDensity: 2.2,
    porosity: 0.25,
    fluid: 'water',
  },
  shaleSands: {
    poreDensity: uniform(BRINE_DENSITY),
    bulkDensity: 2.3,
    porosity: 0.15,
    fluid: 'water',
  },
  seal: {
    poreDensity: { top: BRINE_DENSITY, base: OVERPRESSURE_DENSITY },
    bulkDensity: 2.4,
    porosity: 0.05,
    fluid: 'water',
  },
  reservoir: {
    poreDensity: uniform(OVERPRESSURE_DENSITY),
    bulkDensity: 2.3,
    porosity: 0.22,
    fluid: 'oil',
  },
  base: {
    poreDensity: uniform(OVERPRESSURE_DENSITY),
    bulkDensity: 2.5,
    porosity: 0.05,
    fluid: 'water',
  },
  sourceRock: {
    poreDensity: uniform(OVERPRESSURE_DENSITY),
    bulkDensity: 2.4,
    porosity: 0.08,
    fluid: 'oil',
  },
};

export function layerById(id: LayerId): Layer {
  const layer = LAYERS.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`Unknown layer "${id}"`);
  return layer;
}

export function fluidLeg(id: FluidId): FluidLeg {
  const leg = RESERVOIR_FLUIDS.find((candidate) => candidate.id === id);
  if (!leg) throw new Error(`Unknown fluid leg "${id}"`);
  return leg;
}

function shareThrough(layer: Layer, depth: number): number {
  return (depth - layer.top) / (layer.bottom - layer.top);
}

export function poreDensityAt(depth: number): number {
  const layer = layerAt(depth);
  if (!layer) return SEAWATER_PORE_DENSITY;
  const { top, base } = ROCKS[layer.id].poreDensity;
  return lerp(top, base, shareThrough(layer, depth));
}

export function porosityAt(depth: number): number | null {
  const layer = layerAt(depth);
  return layer ? ROCKS[layer.id].porosity : null;
}

export function poreFluidAt(depth: number): FluidId | null {
  const layer = layerAt(depth);
  if (!layer) return null;
  return fluidAt(depth) ?? ROCKS[layer.id].fluid;
}

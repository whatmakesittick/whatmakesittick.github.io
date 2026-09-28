import { DRILL_FLOOR_ABOVE_SEA_M, SEABED_DEPTH_M, depthBelowSeabed } from './wellPlan';

export const SEA_SURFACE_TEMPERATURE_C = 18;
export const SEABED_TEMPERATURE_C = 4;
export const THERMOCLINE_BASE_M = 1000;
export const THERMOCLINE_SCALE_M = 200;
export const GEOTHERMAL_GRADIENT_C_PER_KM = 30;
export const OIL_WINDOW_C = { min: 60, max: 120 } as const;

const METRES_PER_KM = 1000;
const DECAY_AT_BASE = Math.exp(-THERMOCLINE_BASE_M / THERMOCLINE_SCALE_M);

function thermoclineShare(depthBelowSea: number): number {
  if (depthBelowSea >= THERMOCLINE_BASE_M) return 0;
  const decay = Math.exp(-Math.max(0, depthBelowSea) / THERMOCLINE_SCALE_M);
  return (decay - DECAY_AT_BASE) / (1 - DECAY_AT_BASE);
}

export function seaTemperatureC(depthBelowSea: number): number {
  const warming = SEA_SURFACE_TEMPERATURE_C - SEABED_TEMPERATURE_C;
  return SEABED_TEMPERATURE_C + warming * thermoclineShare(depthBelowSea);
}

export function rockTemperatureC(depth: number): number {
  const kilometres = Math.max(0, depthBelowSeabed(depth)) / METRES_PER_KM;
  return SEABED_TEMPERATURE_C + GEOTHERMAL_GRADIENT_C_PER_KM * kilometres;
}

export function temperatureAtC(depth: number): number {
  if (depth <= SEABED_DEPTH_M) return seaTemperatureC(depth - DRILL_FLOOR_ABOVE_SEA_M);
  return rockTemperatureC(depth);
}

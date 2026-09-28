import type { BitId, LayerId } from '../ids';
import { LAYERS, SECTIONS, isCased, riserLanded, sectionAt } from './wellPlan';

export const BIT_IDS = ['pdc', 'rollerCone'] as const satisfies readonly BitId[];
export const DEFAULT_BIT: BitId = 'pdc';

const PDC_RATE: Record<LayerId, number> = {
  seabed: 40,
  claystone: 25,
  aquifer: 20,
  shaleSands: 15,
  seal: 10,
  reservoir: 12,
  base: 6,
  sourceRock: 6,
};
const ROLLER_CONE_SOFT_ROCK_SHARE = 0.75;
const HARD_LAYERS: ReadonlySet<LayerId> = new Set<LayerId>(['base', 'sourceRock']);

function rollerConeRate(layer: LayerId): number {
  return HARD_LAYERS.has(layer) ? PDC_RATE[layer] : PDC_RATE[layer] * ROLLER_CONE_SOFT_ROCK_SHARE;
}

export const RATE_OF_PENETRATION: Record<BitId, Record<LayerId, number>> = {
  pdc: PDC_RATE,
  rollerCone: {
    seabed: rollerConeRate('seabed'),
    claystone: rollerConeRate('claystone'),
    aquifer: rollerConeRate('aquifer'),
    shaleSands: rollerConeRate('shaleSands'),
    seal: rollerConeRate('seal'),
    reservoir: rollerConeRate('reservoir'),
    base: rollerConeRate('base'),
    sourceRock: rollerConeRate('sourceRock'),
  },
};

export const ON_BOTTOM_SHARE = 0.6;
export const HOURS_PER_DAY = 24;
export const CASING_RUN_HOURS = 2 * HOURS_PER_DAY;
export const RISER_LANDING_HOURS = 3 * HOURS_PER_DAY;
export const TRIP_METRES_PER_HOUR = 300;
export const TRIP_HANDLING_HOURS = 2;

export const JOINT_LENGTH_M = 9.4;
export const JOINTS_PER_STAND = 3;
export const STAND_LENGTH_M = 28;

export const DRILL_PIPE_KG_PER_M = 37.1;
export const DRILL_COLLAR_KG_PER_M = 223;
export const DRILL_COLLAR_LENGTH_M = 150;
export const STEEL_DENSITY = 7.86;

const KG_PER_TONNE = 1000;
const MM_PER_INCH = 25.4;

export function drillingHours(bitDepth: number, bit: BitId): number {
  let hours = 0;
  for (const layer of LAYERS) {
    const drilled = Math.min(bitDepth, layer.bottom) - layer.top;
    if (drilled > 0) hours += drilled / (RATE_OF_PENETRATION[bit][layer.id] * ON_BOTTOM_SHARE);
  }
  return hours;
}

export function roundTripHours(depth: number): number {
  return depth / TRIP_METRES_PER_HOUR + TRIP_HANDLING_HOURS;
}

function sectionChangeHours(bitDepth: number): number {
  let hours = 0;
  for (const section of SECTIONS) {
    if (isCased(section) && bitDepth > section.shoeDepth) {
      hours += CASING_RUN_HOURS + roundTripHours(section.shoeDepth);
    }
  }
  return hours;
}

export function campaignHours(bitDepth: number, bit: BitId): number {
  const riser = riserLanded(bitDepth) ? RISER_LANDING_HOURS : 0;
  return drillingHours(bitDepth, bit) + sectionChangeHours(bitDepth) + riser;
}

export function campaignDay(bitDepth: number, bit: BitId): number {
  return Math.floor(campaignHours(bitDepth, bit) / HOURS_PER_DAY) + 1;
}

export function standsInHole(depth: number): number {
  return Math.ceil(Math.max(0, depth) / STAND_LENGTH_M);
}

export function buoyancyFactor(mudWeight: number): number {
  return 1 - mudWeight / STEEL_DENSITY;
}

export function drillStringWeightT(depth: number, mudWeight: number): number {
  const collars = Math.min(Math.max(0, depth), DRILL_COLLAR_LENGTH_M);
  const pipe = Math.max(0, depth - DRILL_COLLAR_LENGTH_M);
  const airKg = pipe * DRILL_PIPE_KG_PER_M + collars * DRILL_COLLAR_KG_PER_M;
  return (airKg * buoyancyFactor(mudWeight)) / KG_PER_TONNE;
}

export function holeDiameterMm(depth: number): number {
  return sectionAt(depth).holeInches * MM_PER_INCH;
}

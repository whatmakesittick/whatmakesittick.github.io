import type { FluidId, LayerId, SectionId } from '../ids';

export const DRILL_FLOOR_ABOVE_SEA_M = 25;
export const WATER_DEPTH_M = 1000;
export const SEABED_DEPTH_M = DRILL_FLOOR_ABOVE_SEA_M + WATER_DEPTH_M;
export const TOTAL_DEPTH_M = 4500;
export const BLOCK_BOTTOM_DEPTH_M = 4900;
export const STAND_LENGTH_M = 28;

export interface Section {
  id: SectionId;
  holeInches: number;
  casingInches: number;
  shoeDepth: number;
  plannedMudWeight: number;
}

export const SECTIONS: readonly Section[] = [
  { id: 'conductor', holeInches: 36, casingInches: 30, shoeDepth: 1100, plannedMudWeight: 1.04 },
  { id: 'surface', holeInches: 26, casingInches: 20, shoeDepth: 2025, plannedMudWeight: 1.08 },
  {
    id: 'intermediate',
    holeInches: 17.5,
    casingInches: 13.375,
    shoeDepth: 3000,
    plannedMudWeight: 1.2,
  },
  {
    id: 'production',
    holeInches: 12.25,
    casingInches: 9.625,
    shoeDepth: 3950,
    plannedMudWeight: 1.36,
  },
  {
    id: 'reservoir',
    holeInches: 8.5,
    casingInches: 0,
    shoeDepth: TOTAL_DEPTH_M,
    plannedMudWeight: 1.4,
  },
];

export const RISER_LANDED_DEPTH_M = SECTIONS[1].shoeDepth;

export interface Layer {
  id: LayerId;
  top: number;
  bottom: number;
}

export const LAYERS: readonly Layer[] = [
  { id: 'seabed', top: SEABED_DEPTH_M, bottom: 1200 },
  { id: 'claystone', top: 1200, bottom: 2100 },
  { id: 'aquifer', top: 2100, bottom: 2500 },
  { id: 'shaleSands', top: 2500, bottom: 3550 },
  { id: 'seal', top: 3550, bottom: 4000 },
  { id: 'reservoir', top: 4000, bottom: 4300 },
  { id: 'base', top: 4300, bottom: 4700 },
  { id: 'sourceRock', top: 4700, bottom: BLOCK_BOTTOM_DEPTH_M },
];

export interface FluidLeg {
  id: FluidId;
  top: number;
  bottom: number;
}

export const RESERVOIR_FLUIDS: readonly FluidLeg[] = [
  { id: 'gas', top: 4000, bottom: 4060 },
  { id: 'oil', top: 4060, bottom: 4220 },
  { id: 'water', top: 4220, bottom: 4300 },
];

export const OIL_WATER_CONTACT_M = RESERVOIR_FLUIDS[1].bottom;

export function sectionAt(depth: number): Section {
  return SECTIONS.find((section) => depth <= section.shoeDepth) ?? SECTIONS[SECTIONS.length - 1];
}

export function layerAt(depth: number): Layer | undefined {
  return LAYERS.find((layer) => depth >= layer.top && depth < layer.bottom);
}

export function fluidAt(depth: number): FluidId | undefined {
  return RESERVOIR_FLUIDS.find((leg) => depth >= leg.top && depth < leg.bottom)?.id;
}

export function depthBelowSeabed(depth: number): number {
  return depth - SEABED_DEPTH_M;
}

export function isCased(section: Section): boolean {
  return section.casingInches > 0;
}

export function riserLanded(bitDepth: number): boolean {
  return bitDepth >= RISER_LANDED_DEPTH_M;
}

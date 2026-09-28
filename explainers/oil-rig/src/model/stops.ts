import type { SectionId } from '../ids';
import { FINAL_DEPTH_M } from './journey';
import { fluidLeg, layerById } from './rocks';
import { SEABED_DEPTH_M, SECTIONS, fluidAt, layerAt } from './wellPlan';

export const SECTION_IDS: readonly SectionId[] = SECTIONS.map((section) => section.id);

export const LAYER_STOP_IDS = ['seal', 'gasCap', 'oil', 'water', 'sourceRock'] as const;
export type LayerStopId = (typeof LAYER_STOP_IDS)[number];

const SOURCE_ROCK = layerById('sourceRock');
const BELOW_SECTION_TOP_M = 1;

const LAYER_STOP_DEPTHS: Record<LayerStopId, number> = {
  seal: layerById('seal').top,
  gasCap: fluidLeg('gas').top,
  oil: fluidLeg('oil').top,
  water: fluidLeg('water').top,
  sourceRock: FINAL_DEPTH_M,
};

const FLUID_STOPS = { gas: 'gasCap', oil: 'oil', water: 'water' } as const;

export function sectionStartDepth(id: SectionId): number {
  const index = SECTION_IDS.indexOf(id);
  const top = index > 0 ? SECTIONS[index - 1].shoeDepth : SEABED_DEPTH_M;
  return top + BELOW_SECTION_TOP_M;
}

export function layerStopDepth(id: LayerStopId): number {
  return LAYER_STOP_DEPTHS[id];
}

export function layerStopAt(depth: number): LayerStopId | null {
  if (depth >= LAYER_STOP_DEPTHS.sourceRock) return 'sourceRock';
  const fluid = fluidAt(depth);
  if (fluid) return FLUID_STOPS[fluid];
  return layerAt(depth)?.id === 'seal' ? 'seal' : null;
}

export function rockSampleDepth(depth: number): number {
  return layerStopAt(depth) === 'sourceRock' ? SOURCE_ROCK.top : depth;
}

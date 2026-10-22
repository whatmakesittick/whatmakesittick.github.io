import type { Extent } from '@core/scene/regions';
import { CUT_X, MAGNETS, SECTION_EXTENTS, SIDE_SIGNS, SKIDS, TRAIN } from '../../../model';
import { DOOR, PANE } from './constants';

const FRAMES_PER_MODULE = [0.25, 0.75] as const;
const SKID_SHARES = [0.125, 0.875] as const;
const EDDY_PER_SIDE = MAGNETS.eddyPerSection / SIDE_SIGNS.length;
const COUNT_EPSILON = 1e-9;

export const LEAD_SECTION = 0;
export const TAIL_SECTION = SECTION_EXTENTS.length - 1;

export interface SectionLayout {
  readonly extent: Extent;
  readonly modules: readonly Extent[];
  readonly eddyModules: readonly number[];
  readonly arms: readonly number[];
  readonly skids: readonly number[];
  readonly windows: readonly number[];
  readonly doors: readonly number[];
}

function length([from, to]: Extent): number {
  return to - from;
}

export function sectionModules(extent: Extent): Extent[] {
  const count = Math.floor(length(extent) / MAGNETS.moduleLength + COUNT_EPSILON);
  const margin = (length(extent) - count * MAGNETS.moduleLength) / 2;
  return Array.from({ length: count }, (_, index) => {
    const from = extent[0] + margin + index * MAGNETS.moduleLength;
    return [from, from + MAGNETS.moduleLength];
  });
}

export function eddyModuleIndices(moduleCount: number): number[] {
  return Array.from({ length: EDDY_PER_SIDE }, (_, index) =>
    Math.round(((index + 0.5) * moduleCount) / EDDY_PER_SIDE),
  );
}

export function armSlots(extent: Extent): number[] {
  return sectionModules(extent).flatMap(([from]) =>
    FRAMES_PER_MODULE.map((share) => from + share * MAGNETS.moduleLength),
  );
}

export function skidSlots(extent: Extent): number[] {
  const perSide = SKIDS.perSection / SIDE_SIGNS.length;
  return SKID_SHARES.slice(0, perSide).map((share) => extent[0] + share * length(extent));
}

function ownLayout(extent: Extent, index: number): SectionLayout {
  const modules = sectionModules(extent);
  const slots = armSlots(extent);
  const front = index === LEAD_SECTION ? DOOR.frontSlotFromNose : DOOR.rearSlot;
  const doors = [DOOR.rearSlot, slots.length - 1 - front];
  const clearOfNose = (x: number) =>
    index !== LEAD_SECTION || TRAIN.noseX - x >= PANE.noseClearance;
  return {
    extent,
    modules,
    eddyModules: eddyModuleIndices(modules.length),
    arms: slots,
    skids: skidSlots(extent),
    windows: slots.filter((x, slot) => !doors.includes(slot) && clearOfNose(x)),
    doors: doors.map((slot) => slots[slot]),
  };
}

function flip(values: readonly number[]): number[] {
  return values.map((x) => -x).reverse();
}

function flipExtent([from, to]: Extent): Extent {
  return [-to, -from];
}

function mirrored(layout: SectionLayout): SectionLayout {
  const count = layout.modules.length;
  return {
    extent: flipExtent(layout.extent),
    modules: layout.modules.map(flipExtent).reverse(),
    eddyModules: layout.eddyModules.map((module) => count - 1 - module),
    arms: flip(layout.arms),
    skids: flip(layout.skids),
    windows: flip(layout.windows),
    doors: flip(layout.doors),
  };
}

export const TRAIN_LAYOUT: readonly SectionLayout[] = SECTION_EXTENTS.map((extent, index) =>
  index === TAIL_SECTION
    ? mirrored(ownLayout(SECTION_EXTENTS[LEAD_SECTION], LEAD_SECTION))
    : ownLayout(extent, index),
);

export function isAhead(x: number): boolean {
  return x > CUT_X;
}

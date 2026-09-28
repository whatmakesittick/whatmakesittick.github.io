import { depthToY, tubularRadius } from '../../model/scale';
import { DRILL_FLOOR_ABOVE_SEA_M, SECTIONS, SEABED_DEPTH_M } from '../../model/wellPlan';
import { CASING_WALL_INCHES, DEFAULT_WALL_INCHES, STRING, WELL_TUBES } from '../constants';
import type { Section } from '../../model/wellPlan';

export interface HoleInterval {
  section: Section;
  index: number;
  top: number;
  bottom: number;
  radius: number;
}

export function isCasedSection(section: Section): boolean {
  return section.casingInches > 0;
}

const INTERVALS: readonly HoleInterval[] = SECTIONS.map((section, index) => ({
  section,
  index,
  top: index === 0 ? SEABED_DEPTH_M : SECTIONS[index - 1].shoeDepth,
  bottom: section.shoeDepth,
  radius: tubularRadius(section.holeInches),
}));

export function holeIntervals(): readonly HoleInterval[] {
  return INTERVALS;
}

export function slotHalfWidth(): number {
  return Math.max(...holeIntervals().map((interval) => interval.radius));
}

export function holeAt(depth: number): HoleInterval {
  for (const interval of INTERVALS) if (depth <= interval.bottom) return interval;
  return INTERVALS[INTERVALS.length - 1];
}

export function collarRadius(holeInches: number): number {
  const slim = holeInches < STRING.slimHoleInches;
  return tubularRadius(slim ? STRING.slimCollarInches : STRING.collarInches);
}

export function wellY(depth: number, seaOffset: number): number {
  const y = depthToY(depth);
  return depth <= DRILL_FLOOR_ABOVE_SEA_M ? y : y + seaOffset;
}

export function wallInches(casingInches: number): number {
  return CASING_WALL_INCHES[casingInches] ?? DEFAULT_WALL_INCHES;
}

export function tubeWall(casingInches: number): number {
  return Math.max(tubularRadius(wallInches(casingInches) * 2), WELL_TUBES.minWall);
}

export function casingInner(casingInches: number): number {
  return tubularRadius(casingInches) - tubeWall(casingInches);
}

export function lastSetCasing(bitDepth: number): HoleInterval | undefined {
  for (let index = INTERVALS.length - 1; index >= 0; index--) {
    const interval = INTERVALS[index];
    if (isCasedSection(interval.section) && bitDepth > interval.bottom) return interval;
  }
  return undefined;
}

export function annulusWall(depth: number, lastSet: HoleInterval | undefined): number {
  if (lastSet && depth <= lastSet.bottom) return casingInner(lastSet.section.casingInches);
  return holeAt(depth).radius;
}

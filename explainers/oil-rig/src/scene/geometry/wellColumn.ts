import { depthToY, tubularRadius } from '../../model/scale';
import { DRILL_FLOOR_ABOVE_SEA_M, SECTIONS, SEABED_DEPTH_M } from '../../model/wellPlan';
import { CASING_WALL_INCHES, DEFAULT_WALL_INCHES, WELL_TUBES } from '../constants';
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

export function holeIntervals(): HoleInterval[] {
  return SECTIONS.map((section, index) => ({
    section,
    index,
    top: index === 0 ? SEABED_DEPTH_M : SECTIONS[index - 1].shoeDepth,
    bottom: section.shoeDepth,
    radius: tubularRadius(section.holeInches),
  }));
}

export function slotHalfWidth(): number {
  return Math.max(...holeIntervals().map((interval) => interval.radius));
}

export function holeAt(depth: number): HoleInterval {
  const intervals = holeIntervals();
  return intervals.find((interval) => depth <= interval.bottom) ?? intervals[intervals.length - 1];
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
  return holeIntervals()
    .filter((interval) => isCasedSection(interval.section) && bitDepth > interval.bottom)
    .pop();
}

export function annulusWall(depth: number, lastSet: HoleInterval | undefined): number {
  if (lastSet && depth <= lastSet.bottom) return casingInner(lastSet.section.casingInches);
  return holeAt(depth).radius;
}

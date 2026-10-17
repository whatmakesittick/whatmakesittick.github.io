import { clamp } from '@core/math';
import { QUARTER_TURN } from '../gear/lathe';
import type { SectionPoint } from './loft';

export interface RoundSection {
  halfWidth: number;
  top: number;
  waist: number;
  bottom: number;
}

export interface Squareness {
  upper: number;
  lower: number;
}

export interface BoxSection {
  halfWidth: number;
  top: number;
  bottom: number;
  topRadius: number;
  bottomRadius: number;
}

export type BoxRow =
  | { on: 'top'; share: number }
  | { on: 'topCorner'; share: number }
  | { on: 'side'; y: number }
  | { on: 'bottomCorner'; share: number }
  | { on: 'bottom'; share: number };

export interface EndRounding {
  depth: number;
  exponent: number;
  stations: number;
}

function signedPower(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

export function roundPoint(
  section: RoundSection,
  squareness: Squareness,
  theta: number,
): SectionPoint {
  const upper = theta <= QUARTER_TURN;
  const exponent = 2 / (upper ? squareness.upper : squareness.lower);
  const height = upper ? section.top - section.waist : section.waist - section.bottom;
  const across = Math.abs(Math.sin(theta)) ** exponent;
  return [
    section.halfWidth * across,
    section.waist + height * signedPower(Math.cos(theta), exponent),
  ];
}

export function upperHeightAt(section: RoundSection, squareness: Squareness, z: number): number {
  const share = clamp(z / section.halfWidth, 0, 1);
  const rise = (1 - share ** squareness.upper) ** (1 / squareness.upper);
  return section.waist + (section.top - section.waist) * rise;
}

export function upperWidthAt(section: RoundSection, squareness: Squareness, y: number): number {
  const share = clamp((y - section.waist) / (section.top - section.waist), 0, 1);
  return section.halfWidth * (1 - share ** squareness.upper) ** (1 / squareness.upper);
}

export function boxPoint(section: BoxSection, row: BoxRow): SectionPoint {
  const { halfWidth, top, bottom } = section;
  const limit = Math.min(halfWidth, (top - bottom) / 2);
  const topRadius = Math.min(section.topRadius, limit);
  const bottomRadius = Math.min(section.bottomRadius, limit);
  if (row.on === 'top') return [row.share * (halfWidth - topRadius), top];
  if (row.on === 'side') return [halfWidth, clamp(row.y, bottom + bottomRadius, top - topRadius)];
  if (row.on === 'bottom') return [(1 - row.share) * (halfWidth - bottomRadius), bottom];
  const angle = row.share * QUARTER_TURN;
  if (row.on === 'topCorner') {
    const inset = halfWidth - topRadius;
    return [inset + topRadius * Math.sin(angle), top - topRadius * (1 - Math.cos(angle))];
  }
  const inset = halfWidth - bottomRadius;
  return [inset + bottomRadius * Math.cos(angle), bottom + bottomRadius * (1 - Math.sin(angle))];
}

export function endTaper(distance: number, rounding: EndRounding): number {
  if (distance >= rounding.depth) return 1;
  const left = 1 - Math.max(0, distance) / rounding.depth;
  return (1 - left ** rounding.exponent) ** (1 / rounding.exponent);
}

export function endStations(end: number, inward: number, rounding: EndRounding): number[] {
  return Array.from({ length: rounding.stations + 1 }, (_, step) => {
    const share = (step / rounding.stations) ** 2;
    return end + inward * share * rounding.depth;
  });
}

export function spacedStations(from: number, to: number, spacing: number): number[] {
  const count = Math.max(1, Math.round((to - from) / spacing));
  return Array.from({ length: count + 1 }, (_, step) => from + ((to - from) * step) / count);
}

export function mergeStations(
  regular: readonly number[],
  exact: readonly number[],
  minimumGap: number,
): number[] {
  const kept: number[] = [...exact];
  [...regular]
    .sort((a, b) => a - b)
    .forEach((x) => {
      if (kept.every((other) => Math.abs(other - x) >= minimumGap)) kept.push(x);
    });
  return kept.sort((a, b) => a - b);
}

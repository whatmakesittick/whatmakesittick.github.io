import { SUBSTATIONS } from '../../../model';
import { GROUND } from './constants';
import { footprint } from './ground/blocks';
import { LINEARS } from './ground/linears';
import type { Linear } from './ground/linears';

export const SUBSTATION = {
  length: 46,
  depth: 26,
  centreZ: -68.5,
  slide: 6,
  margin: 3,
} as const;

function tileX(line: number): number {
  return ((line % GROUND.period) + GROUND.period) % GROUND.period;
}

function crossesAt(linear: Linear, from: number, to: number): boolean {
  const zFrom = SUBSTATION.centreZ - SUBSTATION.depth / 2;
  const zTo = SUBSTATION.centreZ + SUBSTATION.depth / 2;
  if (linear.axis !== 'z' || linear.span[1] < zFrom || linear.span[0] > zTo) return false;
  const [start, end] = footprint(linear);
  return [-GROUND.period, 0, GROUND.period].some(
    (shift) => start + shift < to + SUBSTATION.margin && end + shift > from - SUBSTATION.margin,
  );
}

function isFree(line: number, linears: readonly Linear[]): boolean {
  const x = tileX(line);
  const half = SUBSTATION.length / 2;
  return !linears.some((linear) => crossesAt(linear, x - half, x + half));
}

export function substationLine(line: number, linears: readonly Linear[] = LINEARS): number {
  for (let step = 0; step * SUBSTATION.slide < GROUND.period; step += 1) {
    const ahead = line + step * SUBSTATION.slide;
    if (isFree(ahead, linears)) return ahead;
  }
  return line;
}

export function substationLines(): number[] {
  return SUBSTATIONS.map((line) => substationLine(line));
}

export function substationTileX(line: number): number {
  return tileX(line);
}

import { around, middle } from '../random';
import type { Range } from '../random';
import { CORRIDOR, GROUND } from '../constants';
import { LINEARS, VERGES } from './linears';
import type { Linear } from './linears';

export interface Block {
  readonly x: Range;
  readonly z: Range;
}

const REACH = GROUND.reach;
const PERIOD = GROUND.period;

export function footprint(linear: Linear): Range {
  return around(linear.centre, linear.width / 2 + VERGES[linear.kind]);
}

function occupiedBands(linears: readonly Linear[]): Range[] {
  const corridor: Range = [CORRIDOR.ghostVerge[0], CORRIDOR.service[1]];
  const bands = linears.filter(({ axis }) => axis === 'x').map(footprint);
  return [...bands, corridor].sort((a, b) => a[0] - b[0]);
}

export function freeBands(linears: readonly Linear[] = LINEARS): Range[] {
  const free: Range[] = [];
  let from = -REACH;
  occupiedBands(linears).forEach(([start, end]) => {
    if (start > from) free.push([from, start]);
    from = Math.max(from, end);
  });
  if (from < REACH) free.push([from, REACH]);
  return free;
}

function crosses(linear: Linear, band: Range): boolean {
  const centre = middle(band);
  return linear.axis === 'z' && linear.span[0] <= centre && linear.span[1] >= centre;
}

function blocksBetween(band: Range, cuts: readonly Range[]): Block[] {
  if (cuts.length === 0) return [{ x: [0, PERIOD], z: band }];
  return cuts.map((cut, index) => {
    const next = cuts[(index + 1) % cuts.length];
    const end = index === cuts.length - 1 ? next[0] + PERIOD : next[0];
    return { x: [cut[1], end], z: band };
  });
}

export function landBlocks(linears: readonly Linear[] = LINEARS): Block[] {
  return freeBands(linears).flatMap((band) => {
    const cuts = linears
      .filter((linear) => crosses(linear, band))
      .map(footprint)
      .sort((a, b) => a[0] - b[0]);
    return blocksBetween(band, cuts);
  });
}

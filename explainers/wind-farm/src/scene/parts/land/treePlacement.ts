import type { TreeLayout } from './constants';
import type { FieldLayout, Run } from './fieldPlan';
import { wavelengthNoise } from './noise';
import { centroid, pointAlong, pointInPolygon, polygonArea } from './polygon';
import type { Polygon } from './polygon';
import { between, seededRandom } from './random';
import type { Random } from './random';

export interface TreeSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  readonly seed: number;
}

export interface TreeArea {
  readonly layout: FieldLayout;
  readonly trees: TreeLayout;
  allowed(x: number, z: number): boolean;
  height(x: number, z: number): number;
}

type Grove = 'hedge' | 'wood';
type Picker = (random: Random) => readonly [number, number];

const HALF = 0.5;
const HEDGE_STEP: readonly [number, number] = [0.8, 1.2];

function firstAtLeast(totals: readonly number[], target: number): number {
  let [low, high] = [0, totals.length - 1];
  while (low < high) {
    const middle = (low + high) >> 1;
    if (totals[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function weightedPick<T>(items: readonly T[], weight: (item: T) => number): (random: Random) => T {
  let sum = 0;
  const totals = items.map((item) => (sum += weight(item)));
  return (random) => items[firstAtLeast(totals, random() * sum)];
}

function runLength({ from, to }: Run): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

interface Row {
  readonly run: Run;
  readonly length: number;
  at: number;
}

function hedgePicker({ hedges }: FieldLayout, trees: TreeLayout): Picker {
  const pick = weightedPick<Run>(hedges, runLength);
  let row: Row | undefined;
  return (random) => {
    if (!row || row.at > row.length) {
      const run = pick(random);
      row = { run, length: runLength(run) || 1, at: random() * trees.hedgeSpacing };
    }
    const { from, to } = row.run;
    const [x, z] = pointAlong(from, to, row.at / row.length);
    const offset = (random() - HALF) * trees.hedgeBand;
    row.at += trees.hedgeSpacing * between(random, HEDGE_STEP);
    return [
      x - ((to[1] - from[1]) / row.length) * offset,
      z + ((to[0] - from[0]) / row.length) * offset,
    ];
  };
}

function woodPicker({ fields }: FieldLayout): Picker {
  const woods: Polygon[] = fields.flatMap(({ wood }) =>
    wood ? [[centroid(wood), ...wood, wood[0]]] : [],
  );
  const pick = weightedPick(woods, polygonArea);
  return (random) => pointInPolygon(pick(random), random);
}

function clustered(trees: TreeLayout, x: number, z: number): boolean {
  return wavelengthNoise(x, z, trees.cluster.wavelength, trees.seed) > trees.cluster.threshold;
}

export function placeTrees(area: TreeArea): TreeSpot[] {
  const { trees, layout } = area;
  const random = seededRandom(trees.seed);
  const budget: Record<Grove, number> = {
    hedge: layout.hedges.length > 0 ? trees.hedgeCount : 0,
    wood: layout.fields.some(({ wood }) => wood) ? trees.woodCount : 0,
  };
  const pickers: Record<Grove, Picker> = {
    hedge: hedgePicker(layout, trees),
    wood: woodPicker(layout),
  };
  const spots: TreeSpot[] = [];
  for (let attempt = 0; attempt < trees.attempts; attempt += 1) {
    if (budget.hedge + budget.wood === 0) break;
    const grove: Grove =
      budget.hedge > 0 && (budget.wood === 0 || attempt % 2 === 0) ? 'hedge' : 'wood';
    const [x, z] = pickers[grove](random);
    if (grove === 'hedge' && !clustered(trees, x, z)) continue;
    if (!area.allowed(x, z)) continue;
    budget[grove] -= 1;
    const scale = between(random, grove === 'wood' ? trees.woodScale : trees.scale);
    spots.push({ x, y: area.height(x, z) - trees.sink, z, scale, seed: random() });
  }
  return spots;
}

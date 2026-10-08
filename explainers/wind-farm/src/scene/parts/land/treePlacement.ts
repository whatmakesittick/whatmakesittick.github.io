import type { GroundRules } from './groundColour';
import type { TreeLayout } from './constants';
import { wavelengthNoise } from './noise';
import { createPatchSample, samplePatch } from './patchwork';
import type { PatchworkLayout } from './patchwork';
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
  readonly layout: PatchworkLayout;
  readonly rules: GroundRules;
  readonly trees: TreeLayout;
  point(random: Random): readonly [number, number];
  allowed(x: number, z: number): boolean;
  height(x: number, z: number): number;
}

type Grove = 'hedge' | 'wood';

const sample = createPatchSample();

function groveAt(area: TreeArea, x: number, z: number): Grove | undefined {
  const { layout, rules, trees } = area;
  samplePatch(layout, x, z, sample);
  if (sample.wood && rules.wooded(x, z)) return 'wood';
  if (!sample.hedge || sample.edge > trees.hedgeBand || !rules.hedged(x, z)) return undefined;
  const cluster = wavelengthNoise(x, z, trees.cluster.wavelength, trees.seed);
  return cluster > trees.cluster.threshold ? 'hedge' : undefined;
}

export function placeTrees(area: TreeArea): TreeSpot[] {
  const { trees } = area;
  const random = seededRandom(trees.seed);
  const budget: Record<Grove, number> = { hedge: trees.hedgeCount, wood: trees.woodCount };
  const spots: TreeSpot[] = [];
  for (let attempt = 0; attempt < trees.attempts; attempt += 1) {
    if (budget.hedge + budget.wood === 0) break;
    const [x, z] = area.point(random);
    const grove = groveAt(area, x, z);
    if (!grove || budget[grove] === 0 || !area.allowed(x, z)) continue;
    budget[grove] -= 1;
    const scale = between(random, grove === 'wood' ? trees.woodScale : trees.scale);
    spots.push({ x, y: area.height(x, z) - trees.sink, z, scale, seed: random() });
  }
  return spots;
}

import { lerp } from '@core/math';
import { SHRUBS } from '../constants';
import { hash2 } from './noise';
import { flatness, terrainHeight, wadiShare } from './terrain';

export interface Shrub {
  x: number;
  y: number;
  z: number;
  tone: number;
}

const CANDIDATES_PER_SHRUB = 4;
const SEEDS = { x: 0, z: 1, keep: 2, tone: 3 } as const;

export function scatterShrubs(): Shrub[] {
  const { count, seed, area, keepOut, wadiBias, lift } = SHRUBS;
  const shrubs: Shrub[] = [];
  for (let index = 0; index < count * CANDIDATES_PER_SHRUB && shrubs.length < count; index += 1) {
    const x = lerp(area.x[0], area.x[1], hash2(index, seed + SEEDS.x));
    const z = lerp(area.z[0], area.z[1], hash2(index, seed + SEEDS.z));
    if (flatness(x, z) > keepOut) continue;
    const chance = 1 - wadiBias + wadiBias * wadiShare(x, z);
    if (hash2(index, seed + SEEDS.keep) > chance) continue;
    shrubs.push({ x, y: terrainHeight(x, z) + lift, z, tone: hash2(index, seed + SEEDS.tone) });
  }
  return shrubs;
}

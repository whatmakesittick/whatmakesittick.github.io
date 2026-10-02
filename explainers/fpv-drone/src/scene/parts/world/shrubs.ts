import { Color, NormalBlending } from 'three';
import type { Points } from 'three';
import { lerp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { PAD, STATION } from '../../../model/layout';
import { ROADS, SHRUBS } from '../../constants';
import { hash2 } from '../../geometry/noise';
import { registered } from '../context';
import type { PartContext } from '../context';

export interface Shrub {
  x: number;
  z: number;
  tone: number;
}

const CANDIDATES_PER_SHRUB = 3;
const SEEDS = { x: 0, z: 1, tone: 2 } as const;

function nearStation(x: number, z: number): boolean {
  const keep = SHRUBS.keepOut.station;
  const minX = Math.min(STATION[0], PAD[0]) - keep;
  const maxX = Math.max(STATION[0], PAD[0]) + keep;
  return x > minX && x < maxX && Math.abs(z) < keep;
}

function onRoad(x: number, z: number): boolean {
  const keep = ROADS.halfWidth + SHRUBS.keepOut.road;
  return Math.abs(z - ROADS.along.z) < keep || Math.abs(x - ROADS.across.x) < keep;
}

export function scatterShrubs(): Shrub[] {
  const { count, seed, area } = SHRUBS;
  const shrubs: Shrub[] = [];
  for (let index = 0; index < count * CANDIDATES_PER_SHRUB && shrubs.length < count; index += 1) {
    const x = lerp(area.x[0], area.x[1], hash2(index, seed + SEEDS.x));
    const z = lerp(area.z[0], area.z[1], hash2(index, seed + SEEDS.z));
    if (nearStation(x, z) || onRoad(x, z)) continue;
    shrubs.push({ x, z, tone: hash2(index, seed + SEEDS.tone) });
  }
  return shrubs;
}

export function createShrubs(context: PartContext): Points {
  const shrubs = scatterShrubs();
  const material = registered(
    context,
    UNDIMMED_GROUP,
    createPointMaterial(context.textures.dot, SHRUBS.size, NormalBlending),
  );
  const cloud = context.tracker.track(new PointCloud(shrubs.length, material));
  const palette = SHRUBS.colours.map((colour) => new Color(colour));
  shrubs.forEach((shrub, index) => {
    const tint = palette[Math.floor(shrub.tone * palette.length)];
    cloud.setPoint(index, shrub.x, SHRUBS.lift, shrub.z);
    cloud.setColor(index, tint.r, tint.g, tint.b, SHRUBS.opacity);
  });
  cloud.commit();
  return cloud.points;
}

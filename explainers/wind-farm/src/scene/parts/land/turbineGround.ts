import { Color } from 'three';
import { smoothstep } from '@core/math';
import { TURBINE_LAND, terrainHeight } from '../../../model/layout';
import { HARDSTAND, TRACK, TURBINE_GROUND } from './constants';
import { GROUND_PAINT } from './fieldConstants';
import type { GroundRules } from './fieldPlan';
import { distanceToPolyline } from './keepOut';

const WHITE = new Color(1, 1, 1);
const GRAVEL = new Color(GROUND_PAINT.gravel);
const MEADOW = new Color(TURBINE_GROUND.meadow.colour);
const GRAVEL_OVER_MEADOW = new Color(GRAVEL.r / MEADOW.r, GRAVEL.g / MEADOW.g, GRAVEL.b / MEADOW.b);

export function turbineLandHeight(x: number, z: number): number {
  const { flatRadius, blendRadius } = TURBINE_LAND;
  return terrainHeight(x, z) * smoothstep(Math.hypot(x, z), flatRadius, blendRadius);
}

export function trackDistance(x: number, z: number): number {
  return distanceToPolyline(TRACK.points, x, z);
}

function onHardstand(x: number, z: number): boolean {
  const { pad, apronRadius } = HARDSTAND;
  const onPad = x >= pad.minX && x <= pad.maxX && z >= pad.minZ && z <= pad.maxZ;
  return onPad || Math.hypot(x, z) <= apronRadius;
}

export const TURBINE_RULES: GroundRules = {
  wooded: (x, z) => Math.hypot(x, z) > TURBINE_GROUND.woodClear,
  hedged: (x, z) => Math.hypot(x, z) > TURBINE_GROUND.hedgeClear,
};

export function turbineGroundTint(x: number, z: number): Color {
  return onHardstand(x, z) ? GRAVEL_OVER_MEADOW : WHITE;
}

export function turbineGroundAlpha(x: number, z: number): number {
  const { radius } = TURBINE_LAND;
  return 1 - smoothstep(Math.hypot(x, z), radius * TURBINE_GROUND.alphaFrom, radius);
}

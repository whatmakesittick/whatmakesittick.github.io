import { Color } from 'three';
import { smoothstep } from '@core/math';
import { TURBINE_LAND, terrainHeight } from '../../../model/layout';
import { GROUND, HARDSTAND, TRACK, TURBINE_GROUND, TURBINE_PATCHWORK } from './constants';
import { bandShare, fadeToHaze, patchColour, weather } from './groundColour';
import type { GroundRules } from './groundColour';
import { distanceToPolyline } from './keepOut';

const MEADOW = new Color(TURBINE_GROUND.meadow.colour);
const GRAVEL = new Color(GROUND.gravel);

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

export function turbineGroundColour(x: number, z: number, spacing: number, out: Color): Color {
  const radius = Math.hypot(x, z);
  const { meadow, hazeFrom } = TURBINE_GROUND;
  patchColour(TURBINE_PATCHWORK, TURBINE_RULES, x, z, spacing, out);
  out.lerp(MEADOW, 1 - smoothstep(radius, meadow.inner, meadow.outer));
  const gravel = onHardstand(x, z) ? 1 : bandShare(trackDistance(x, z), spacing, TRACK.band);
  out.lerp(GRAVEL, gravel);
  weather(x, z, out);
  return fadeToHaze(out, smoothstep(radius, TURBINE_LAND.radius * hazeFrom, TURBINE_LAND.radius));
}

export function turbineGroundAlpha(x: number, z: number): number {
  const { radius } = TURBINE_LAND;
  return 1 - smoothstep(Math.hypot(x, z), radius * TURBINE_GROUND.alphaFrom, radius);
}

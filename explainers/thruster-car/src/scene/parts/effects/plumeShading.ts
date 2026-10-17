import { Color } from 'three';
import { clamp, lerp } from '@core/math';
import { PLUME_SHADING } from './constants';

export interface Tone {
  r: number;
  g: number;
  b: number;
}

const SHADE = new Color(PLUME_SHADING.shade);
const SUNLIT = new Color(PLUME_SHADING.sunlit);

export function puffLight(facing: number, upness: number): number {
  const { base, sun, top } = PLUME_SHADING;
  return clamp(base + sun * facing + top * upness, 0, 1);
}

export function shadePuff(light: number, clear: number, base: Tone, out: Tone): Tone {
  const lit = lerp(light, 1, clear);
  const warmth = PLUME_SHADING.warmth * light * light;
  out.r = lerp(lerp(SHADE.r, base.r, lit), SUNLIT.r, warmth);
  out.g = lerp(lerp(SHADE.g, base.g, lit), SUNLIT.g, warmth);
  out.b = lerp(lerp(SHADE.b, base.b, lit), SUNLIT.b, warmth);
  return out;
}

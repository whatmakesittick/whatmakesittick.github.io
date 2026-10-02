import { FULL_TURN } from '@core/math';
import { MESAS } from '../constants';
import { valueNoise } from './noise';
import type { Ring } from './rings';

const JAG_DENSITY = 0.3;
const JAG_STEP = 7;

export interface MesaSite {
  x: number;
  z: number;
  radius: number;
  height: number;
  seed: number;
}

export function outlineRadius(site: MesaSite, angle: number): number {
  const wobble = valueNoise(
    Math.cos(angle) * MESAS.wobble + site.seed * MESAS.wobble,
    Math.sin(angle) * MESAS.wobble,
    site.seed,
  );
  return site.radius * (1 - MESAS.roughness / 2 + MESAS.roughness * wobble);
}

function jagged(site: MesaSite, angle: number, layer: number): number {
  return valueNoise(angle * MESAS.points * JAG_DENSITY, layer * JAG_STEP, site.seed + layer) - 0.5;
}

export function mesaRings(site: MesaSite): Ring[] {
  const angles = Array.from(
    { length: MESAS.points },
    (_, index) => (index / MESAS.points) * FULL_TURN,
  );
  const reach = angles.map((angle) => outlineRadius(site, angle));
  return MESAS.layers.map(({ height, spread, jag }, layer) =>
    angles.map((angle, index) => {
      const radius = reach[index] * (spread + jag * jagged(site, angle, layer));
      return [
        site.x + radius * Math.cos(angle),
        site.height * height,
        site.z + radius * Math.sin(angle),
      ] as const;
    }),
  );
}

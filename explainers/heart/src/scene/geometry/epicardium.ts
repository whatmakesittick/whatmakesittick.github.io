import { Color } from 'three';
import type { Vector3 } from 'three';
import type { Field } from './field';

export interface EpicardiumStyle {
  readonly muscle: string;
  readonly fat: string;
  readonly fatShare: number;
  readonly fatNearMm: number;
  readonly fatFarMm: number;
  readonly occlusionSteps: readonly number[];
  readonly occlusionStrength: number;
  readonly occlusionFloor: number;
}

export interface Vessel {
  readonly points: readonly Vector3[];
  readonly radius: number;
}

export type Colour3 = readonly [number, number, number];

export type SurfacePainter = (
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
) => Colour3;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const share = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return share * share * (3 - 2 * share);
}

export function occlusion(
  field: Field,
  style: EpicardiumStyle,
  point: readonly number[],
  normal: readonly number[],
): number {
  let shadow = 0;
  style.occlusionSteps.forEach((step, index) => {
    const distance = field.distance(
      point[0] + normal[0] * step,
      point[1] + normal[1] * step,
      point[2] + normal[2] * step,
    );
    shadow += Math.max(0, step - distance) / step / 2 ** index;
  });
  return Math.max(style.occlusionFloor, 1 - style.occlusionStrength * shadow);
}

export function fatShare(
  vessels: readonly Vessel[],
  style: EpicardiumStyle,
  x: number,
  y: number,
  z: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const vessel of vessels) {
    for (const point of vessel.points) {
      const gap = Math.hypot(point.x - x, point.y - y, point.z - z) - vessel.radius;
      if (gap < nearest) nearest = gap;
    }
  }
  return style.fatShare * (1 - smoothstep(style.fatNearMm, style.fatFarMm, nearest));
}

export function epicardiumPainter(
  field: Field,
  vessels: readonly Vessel[],
  style: EpicardiumStyle,
): SurfacePainter {
  const muscle = new Color(style.muscle);
  const fat = new Color(style.fat);
  const mixed = new Color();
  return (x, y, z, nx, ny, nz) => {
    mixed.copy(muscle).lerp(fat, fatShare(vessels, style, x, y, z));
    const light = occlusion(field, style, [x, y, z], [nx, ny, nz]);
    return [mixed.r * light, mixed.g * light, mixed.b * light];
  };
}

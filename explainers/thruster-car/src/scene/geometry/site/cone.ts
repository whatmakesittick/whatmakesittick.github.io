import { Color, Float32BufferAttribute, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { extrudePlan, roundedRectShape } from '@core/scene/geometry/extrude';
import { THEME } from '../../../theme';
import { mergeParts } from '../../parts/context';

export const CONE = {
  height: 0.7,
  baseRadius: 0.15,
  tipRadius: 0.025,
  plate: { half: 0.19, thickness: 0.03, corner: 0.05 },
  bands: [
    [0.3, 0.42],
    [0.48, 0.56],
  ],
  segments: 12,
  plateColour: '#2a2a2d',
} as const;

const RGB = 3;

function radiusAt(y: number): number {
  const { height, baseRadius, tipRadius, plate } = CONE;
  const share = (y - plate.thickness) / (height - plate.thickness);
  return baseRadius + (tipRadius - baseRadius) * share;
}

function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const colour = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const colours = Array.from({ length: count }, () => colour.toArray()).flat();
  geometry.setAttribute('color', new Float32BufferAttribute(colours, RGB));
  return geometry;
}

function slice(from: number, to: number, hex: string, closeTop = false): BufferGeometry {
  const profile = [new Vector2(radiusAt(from), from), new Vector2(radiusAt(to), to)];
  if (closeTop) profile.push(new Vector2(0, to));
  return painted(new LatheGeometry(profile, CONE.segments), hex);
}

function bodySlices(): BufferGeometry[] {
  const edges = [CONE.plate.thickness, ...CONE.bands.flat(), CONE.height];
  return edges.slice(0, -1).map((from, index) => {
    const to = edges[index + 1];
    const white = index % 2 === 1;
    return slice(from, to, white ? THEME.paint : THEME.cone, index === edges.length - 2);
  });
}

function plateGeometry(): BufferGeometry {
  const { half, thickness, corner } = CONE.plate;
  const shape = roundedRectShape({ minA: -half, minB: -half, maxA: half, maxB: half }, corner);
  return painted(extrudePlan(shape, 0, thickness), CONE.plateColour);
}

export function coneGeometry(): BufferGeometry {
  return mergeParts([plateGeometry(), ...bodySlices()]);
}

import { BufferAttribute, BufferGeometry } from 'three';
import type { Point } from '../../../ids';
import type { ArrowShape } from './arrowMaterial';

export type ArrowPlane = 'ground' | 'upright';

export interface ArrowSpec {
  readonly tail: Point;
  readonly length: number;
  readonly rate: number;
}

const XYZ = 3;
const CORNERS = [
  [0, -1],
  [1, -1],
  [0, 1],
  [1, 1],
] as const;

export function arrowGeometry(
  arrows: readonly ArrowSpec[],
  shape: ArrowShape,
  plane: ArrowPlane,
): BufferGeometry {
  const reach = Math.max(shape.headHalf, shape.chevronHalf) + shape.margin;
  const positions: number[] = [];
  const along: number[] = [];
  const lengths: number[] = [];
  const rates: number[] = [];
  const indices: number[] = [];
  arrows.forEach(({ tail, length, rate }, index) => {
    const first = index * CORNERS.length;
    CORNERS.forEach(([end, side]) => {
      const u = end === 0 ? -shape.margin : length + shape.margin;
      const w = side * reach;
      const [x, y, z] = tail;
      positions.push(x + u, plane === 'upright' ? y + w : y, plane === 'ground' ? z + w : z);
      along.push(u, w);
      lengths.push(length);
      rates.push(rate);
    });
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('aArrow', new BufferAttribute(new Float32Array(along), 2));
  geometry.setAttribute('aLength', new BufferAttribute(new Float32Array(lengths), 1));
  geometry.setAttribute('aRate', new BufferAttribute(new Float32Array(rates), 1));
  geometry.setIndex(indices);
  return geometry;
}

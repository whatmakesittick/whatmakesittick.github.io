import { CylinderGeometry, ExtrudeGeometry, SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import type { Point } from '../../ids';

const QUARTER_TURN = Math.PI / 2;
const BEVEL_SEGMENTS = 3;
const CURVE_SEGMENTS = 8;

export interface Slab {
  readonly halfX: number;
  readonly halfZ: number;
  readonly corner: number;
  readonly bottom: number;
  readonly top: number;
  readonly bevel: number;
}

export function roundedSlab({ halfX, halfZ, corner, bottom, top, bevel }: Slab): BufferGeometry {
  const shape = roundedRectShape(
    { minA: -halfX + bevel, maxA: halfX - bevel, minB: -halfZ + bevel, maxB: halfZ - bevel },
    corner - bevel,
  );
  const geometry = new ExtrudeGeometry(shape, {
    depth: top - bottom - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(0, top - bevel, 0);
  return geometry;
}

export function cylinderAlongZ(
  radius: number,
  depth: number,
  [x, y, z]: Point,
  segments: number,
  topRadius = radius,
): BufferGeometry {
  const geometry = new CylinderGeometry(topRadius, radius, depth, segments);
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(x, y, z + depth / 2);
  return geometry;
}

export function cylinderAt(
  radius: number,
  bottom: number,
  top: number,
  [x, z]: readonly [number, number],
  segments: number,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, top - bottom, segments);
  geometry.translate(x, (bottom + top) / 2, z);
  return geometry;
}

export function sphereAt(
  radius: number,
  [x, y, z]: Point,
  [width, height]: readonly [number, number],
): BufferGeometry {
  const geometry = new SphereGeometry(radius, width, height);
  geometry.translate(x, y, z);
  return geometry;
}

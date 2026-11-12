import { BufferAttribute, Color, PlaneGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from '../../../ids';
import { span } from '../fab/shapes';
import type { Footprint } from './dims';

const QUARTER_TURN = Math.PI / 2;
const RGB = 3;
const FACING = 0.5;
const FACE_LIGHT = { up: 1, down: 0.4, front: 0.78, back: 0.5, left: 0.64, right: 0.56 } as const;

export type Facing = 'up' | 'down';
export type BakedBox = readonly [Point, Point, string, number];

export function width(rect: Footprint): number {
  return rect.maxX - rect.minX;
}

export function depth(rect: Footprint): number {
  return rect.maxZ - rect.minZ;
}

export function flat(rect: Footprint, y: number, facing: Facing): BufferGeometry {
  const turn = facing === 'up' ? -QUARTER_TURN : QUARTER_TURN;
  return new PlaneGeometry(width(rect), depth(rect))
    .rotateX(turn)
    .translate((rect.minX + rect.maxX) / 2, y, (rect.minZ + rect.maxZ) / 2);
}

export function worldUv(geometry: BufferGeometry, metres: number, offsetZ = 0): BufferGeometry {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, position.getX(index) / metres, (position.getZ(index) - offsetZ) / metres);
  }
  return geometry;
}

function faceLight(x: number, y: number, z: number): number {
  if (y > FACING) return FACE_LIGHT.up;
  if (y < -FACING) return FACE_LIGHT.down;
  if (z > FACING) return FACE_LIGHT.front;
  if (z < -FACING) return FACE_LIGHT.back;
  return x < 0 ? FACE_LIGHT.left : FACE_LIGHT.right;
}

export function baked(geometry: BufferGeometry, hex: string, shade = 1): BufferGeometry {
  const colour = new Color(hex).multiplyScalar(shade);
  const normal = geometry.getAttribute('normal');
  const colours = new Float32Array(normal.count * RGB);
  for (let index = 0; index < normal.count; index += 1) {
    const light = faceLight(normal.getX(index), normal.getY(index), normal.getZ(index));
    colours[index * RGB] = colour.r * light;
    colours[index * RGB + 1] = colour.g * light;
    colours[index * RGB + 2] = colour.b * light;
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

export function minus(outer: Footprint, hole: Footprint): Footprint[] {
  return [
    { ...outer, maxX: hole.minX },
    { ...outer, minX: hole.maxX },
    { minX: hole.minX, maxX: hole.maxX, minZ: outer.minZ, maxZ: hole.minZ },
  ];
}

export function merged(geometries: BufferGeometry[], what: string): BufferGeometry {
  const result = mergeGeometries(geometries);
  geometries.forEach((geometry) => geometry.dispose());
  if (!result) throw new Error(`${what} cannot be merged`);
  return result;
}

export function bakedBoxes(boxes: readonly BakedBox[], what: string): BufferGeometry {
  return merged(
    boxes.map(([min, max, hex, shade]) => baked(span(min, max), hex, shade)),
    what,
  );
}

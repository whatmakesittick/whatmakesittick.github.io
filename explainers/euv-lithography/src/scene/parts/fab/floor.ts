import { CanvasTexture, CylinderGeometry, RepeatWrapping, SRGBColorSpace } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import { instanced, placement } from '../kit';
import type { PartContext } from '../context';
import type { Batch } from './batch';
import {
  FLOOR,
  HATCH,
  NOSING_RISE,
  NOSING_WIDTH,
  PEDESTAL_PITCH,
  PEDESTAL_RADIUS,
  PEDESTAL_ROWS,
  PLENUM_BOTTOM,
  SHAFT_WALL,
  SLAB_BOTTOM,
  TILE_M,
  TILE_TOP,
} from './dims';
import { span } from './shapes';

const TEXTURE_SIZE = 128;
const SEAM_PX = 4;
const SEAM_COLOR = '#7d8288';
const BEVEL_COLOR = '#f3f4f5';
const UP_NORMAL = 0.5;
const PLAIN_UV = 0.5;
const ANISOTROPY = 8;
const PLENUM_PANEL = 0.04;
const STRINGER = 0.05;
const ENDS_Z: readonly number[] = [-2.4, -1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8, 2.4];

function tileTexture(context: PartContext): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const paint = canvas.getContext('2d');
  if (paint) {
    paint.fillStyle = '#ffffff';
    paint.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    paint.strokeStyle = BEVEL_COLOR;
    paint.lineWidth = SEAM_PX;
    paint.strokeRect(
      SEAM_PX * 2,
      SEAM_PX * 2,
      TEXTURE_SIZE - SEAM_PX * 4,
      TEXTURE_SIZE - SEAM_PX * 4,
    );
    paint.strokeStyle = SEAM_COLOR;
    paint.lineWidth = SEAM_PX;
    paint.strokeRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return context.tracker.track(texture);
}

function tileUv(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    const up = normal.getY(index) > UP_NORMAL;
    uv.setXY(
      index,
      up ? position.getX(index) / TILE_M : PLAIN_UV,
      up ? position.getZ(index) / TILE_M : PLAIN_UV,
    );
  }
  return geometry;
}

interface Rect {
  x: readonly [number, number];
  z: readonly [number, number];
}

function aroundHatch(): Rect[] {
  const left = HATCH.x - HATCH.half;
  const right = HATCH.x + HATCH.half;
  const back = HATCH.z - HATCH.half;
  const front = HATCH.z + HATCH.half;
  return [
    { x: [FLOOR.minX, left], z: [FLOOR.minZ, FLOOR.maxZ] },
    { x: [right, FLOOR.maxX], z: [FLOOR.minZ, FLOOR.maxZ] },
    { x: [left, right], z: [FLOOR.minZ, back] },
    { x: [left, right], z: [front, FLOOR.maxZ] },
  ];
}

function layer(
  batch: Batch,
  finish: MaterialFinish | 'subfloor',
  top: number,
  bottom: number,
): void {
  aroundHatch().forEach((rect) => {
    batch.add(
      STRUCTURE_GROUP,
      finish,
      span([rect.x[0], bottom, rect.z[0]], [rect.x[1], top, rect.z[1]]),
    );
  });
}

function tiles(batch: Batch, finish: MaterialFinish): void {
  aroundHatch().forEach((rect) => {
    const slab = span([rect.x[0], TILE_TOP, rect.z[0]], [rect.x[1], 0, rect.z[1]]);
    batch.add(STRUCTURE_GROUP, finish, tileUv(slab));
  });
}

function nosing(batch: Batch): void {
  const { minX, maxX, minZ, maxZ } = FLOOR;
  const top = NOSING_RISE;
  const bottom = TILE_TOP - 0.01;
  const edges: [[number, number, number], [number, number, number]][] = [
    [
      [minX, bottom, maxZ - NOSING_WIDTH],
      [maxX, top, maxZ],
    ],
    [
      [minX, bottom, minZ],
      [maxX, top, minZ + NOSING_WIDTH],
    ],
    [
      [minX, bottom, minZ],
      [minX + NOSING_WIDTH, top, maxZ],
    ],
    [
      [maxX - NOSING_WIDTH, bottom, minZ],
      [maxX, top, maxZ],
    ],
  ];
  edges.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'frame', span(min, max)));
}

function plenumPanels(batch: Batch): void {
  const { minX, minZ } = FLOOR;
  const span2 = span([minX, PLENUM_BOTTOM, minZ], [FLOOR.maxX, TILE_TOP, minZ + PLENUM_PANEL]);
  batch.add(STRUCTURE_GROUP, 'subfloor', span2);
}

function shaft(batch: Batch): void {
  const { x, z, half } = HATCH;
  const [bottom, top] = [SLAB_BOTTOM, 0];
  const walls: [[number, number, number], [number, number, number]][] = [
    [
      [x - half - SHAFT_WALL, bottom, z - half],
      [x - half, top, z + half],
    ],
    [
      [x + half, bottom, z - half],
      [x + half + SHAFT_WALL, top, z + half],
    ],
    [
      [x - half, bottom, z - half - SHAFT_WALL],
      [x + half, top, z - half],
    ],
    [
      [x - half, bottom, z + half],
      [x + half, top, z + half + SHAFT_WALL],
    ],
  ];
  walls.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'hatch', span(min, max)));
}

function pedestals(context: PartContext, batch: Batch): InstancedMesh {
  const height = TILE_TOP - PLENUM_BOTTOM;
  const count = Math.floor((FLOOR.maxX - FLOOR.minX) / PEDESTAL_PITCH);
  const geometry = new CylinderGeometry(PEDESTAL_RADIUS, PEDESTAL_RADIUS, height, 10);
  const matrices = PEDESTAL_ROWS.flatMap((z) =>
    Array.from({ length: count }, (_, index) =>
      placement([FLOOR.minX + PEDESTAL_PITCH * (index + 0.5), TILE_TOP - height / 2, z]),
    ),
  );
  PEDESTAL_ROWS.forEach((z) => {
    const min: Point = [FLOOR.minX, TILE_TOP - STRINGER, z - STRINGER / 2];
    const max: Point = [FLOOR.maxX, TILE_TOP, z + STRINGER / 2];
    batch.add(STRUCTURE_GROUP, 'tray', span(min, max));
  });
  const ends = [0, 1, count - 2, count - 1].flatMap((column) =>
    ENDS_Z.map((z) =>
      placement([FLOOR.minX + PEDESTAL_PITCH * (column + 0.5), TILE_TOP - height / 2, z]),
    ),
  );
  [FLOOR.minX + PEDESTAL_PITCH * 0.5, FLOOR.maxX - PEDESTAL_PITCH * 0.5].forEach((x) => {
    const min: Point = [x - STRINGER / 2, TILE_TOP - STRINGER, FLOOR.minZ];
    const max: Point = [x + STRINGER / 2, TILE_TOP, FLOOR.maxZ];
    batch.add(STRUCTURE_GROUP, 'tray', span(min, max));
  });
  return instanced(context, geometry, STRUCTURE_GROUP, 'flange', [...matrices, ...ends]);
}

export function buildFloor(context: PartContext, batch: Batch): InstancedMesh {
  const finish: MaterialFinish = { ...FINISHES.floor, map: tileTexture(context) };
  tiles(batch, finish);
  layer(batch, 'subfloor', PLENUM_BOTTOM, SLAB_BOTTOM);
  nosing(batch);
  plenumPanels(batch);
  shaft(batch);
  return pedestals(context, batch);
}

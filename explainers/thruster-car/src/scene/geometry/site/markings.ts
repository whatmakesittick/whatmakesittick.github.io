import { smoothstep } from '@core/math';
import { PlaneGeometry } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import type { Footprint } from '../../../model/layout';
import { SITE } from '../../../model/layout';
import { mergeParts } from '../../parts/context';
import { QUARTER_TURN } from '../turns';
import { hash2, tileNoise } from './noise';
import { paintTexture } from './textures';
import type { Rgba } from './textures';

const MARKINGS = {
  lift: 0.002,
  line: 0.12,
  startLine: { width: 0.25, halfSpan: 3 },
  landing: { line: 0.15, corner: 1.2, cornerWidth: 0.25, cornerGap: 0.4, cross: 1.2 },
  finish: { square: 0.4, rows: 2, inset: 0.2 },
  wear: { metres: 1.6, size: 128, from: 0.62, to: 0.68, patches: 0.7, seed: 53 },
} as const;

const OCTAVES = 3;
const NOISE = {
  patches: tileNoise({ u: 6, v: 6 }, OCTAVES, MARKINGS.wear.seed),
  scuffs: tileNoise({ u: 24, v: 24 }, OCTAVES, MARKINGS.wear.seed + 1),
} as const;
const SPECK = 0.93;
const DIRT = 0.12;
const CORNERS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

export interface MarkRect {
  x: readonly [number, number];
  z: readonly [number, number];
}

function rect(x0: number, x1: number, z0: number, z1: number): MarkRect {
  return { x: [Math.min(x0, x1), Math.max(x0, x1)], z: [Math.min(z0, z1), Math.max(z0, z1)] };
}

export function outline(box: Footprint, width: number): MarkRect[] {
  const [x0, x1] = box.x;
  const [z0, z1] = box.z;
  return [
    rect(x0, x1, z0, z0 + width),
    rect(x0, x1, z1 - width, z1),
    rect(x0, x0 + width, z0 + width, z1 - width),
    rect(x1 - width, x1, z0 + width, z1 - width),
  ];
}

export function startMarks(): MarkRect[] {
  const box = SITE.startBox;
  const { width, halfSpan } = MARKINGS.startLine;
  return [...outline(box, MARKINGS.line), rect(box.x[1], box.x[1] + width, -halfSpan, halfSpan)];
}

function cornerMark(box: Footprint, sideX: number, sideZ: number): MarkRect[] {
  const { corner, cornerWidth, cornerGap } = MARKINGS.landing;
  const x = sideX < 0 ? box.x[0] - cornerGap : box.x[1] + cornerGap;
  const z = sideZ < 0 ? box.z[0] - cornerGap : box.z[1] + cornerGap;
  return [
    rect(x, x - sideX * corner, z, z - sideZ * cornerWidth),
    rect(x, x - sideX * cornerWidth, z - sideZ * cornerWidth, z - sideZ * corner),
  ];
}

export function landingMarks(box: Footprint): MarkRect[] {
  const { line, cross } = MARKINGS.landing;
  const centreX = (box.x[0] + box.x[1]) / 2;
  const centreZ = (box.z[0] + box.z[1]) / 2;
  const half = line / 2;
  return [
    ...outline(box, line),
    ...CORNERS.flatMap(([sideX, sideZ]) => cornerMark(box, sideX, sideZ)),
    rect(centreX - cross, centreX + cross, centreZ - half, centreZ + half),
    rect(centreX - half, centreX + half, centreZ - cross, centreZ - half),
    rect(centreX - half, centreX + half, centreZ + half, centreZ + cross),
  ];
}

export function finishMarks(): MarkRect[] {
  const { square, rows, inset } = MARKINGS.finish;
  const [from, to] = [SITE.run.z[0] + inset, SITE.run.z[1] - inset];
  const columns = Math.floor((to - from) / square);
  const start = (from + to - columns * square) / 2;
  const marks: MarkRect[] = [];
  for (let row = 0; row < rows; row += 1) {
    const x = SITE.finishLineX + (row - rows / 2) * square;
    for (let column = row % 2; column < columns; column += 2) {
      const z = start + column * square;
      marks.push(rect(x, x + square, z, z + square));
    }
  }
  return marks;
}

function markQuad(mark: MarkRect): BufferGeometry {
  const width = mark.x[1] - mark.x[0];
  const depth = mark.z[1] - mark.z[0];
  const plane = new PlaneGeometry(width, depth);
  plane.rotateX(-QUARTER_TURN);
  plane.translate((mark.x[0] + mark.x[1]) / 2, MARKINGS.lift, (mark.z[0] + mark.z[1]) / 2);
  const position = plane.getAttribute('position');
  const uv = plane.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, position.getX(index), position.getZ(index));
  }
  return plane;
}

export function marksGeometry(marks: readonly MarkRect[]): BufferGeometry {
  return mergeParts(marks.map(markQuad));
}

export function wornPaint(u: number, v: number): Rgba {
  const { from, to, seed, size, patches: share } = MARKINGS.wear;
  const patches = NOISE.patches(u, v);
  const scuffs = NOISE.scuffs(u, v);
  const speck = hash2(Math.floor(u * size), Math.floor(v * size), seed);
  const worn = smoothstep(patches * share + scuffs * (1 - share), from, to);
  const level = 1 - DIRT * scuffs;
  return [level, level, level, speck > SPECK ? 0 : 1 - worn];
}

export function wornPaintMap(): DataTexture {
  const { size, metres } = MARKINGS.wear;
  const texture = paintTexture({ width: size, height: size }, wornPaint);
  texture.repeat.set(1 / metres, 1 / metres);
  return texture;
}

import { lerp, smoothstep } from '@core/math';
import { Color } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { arrayGeometry } from './arrays';
import { nearRun } from './bushes';
import { GROUND } from './groundGrid';
import { fractalNoise, hash2, tileNoise } from './noise';
import { onTrack } from './tracks';
import { mixRgb, paintDecal, srgb } from './textures';
import type { Rgba } from './textures';

export interface Card {
  x: number;
  z: number;
  width: number;
  height: number;
  yaw: number;
  tone: number;
  variant: number;
}

export interface CardTint {
  from: string;
  to: string;
  light: readonly [number, number];
}

interface Ring {
  count: number;
  spread: number;
  radius: readonly [number, number];
  height: readonly [number, number];
  aspect: readonly [number, number];
  sink: number;
  seed: number;
}

interface Blob {
  x: number;
  y: number;
  radius: number;
}

export const SCRUB_CARDS = {
  count: 520,
  radius: [30, 290],
  height: [0.9, 2.4],
  aspect: [1.3, 2],
  sink: 0.08,
  spread: 2,
  size: { width: 256, height: 128 },
  tint: { from: '#c4cba8', to: '#e2c8a2', light: [0.7, 1.05] },
  seed: 83,
} as const;

export const TREE_LINE = {
  count: 190,
  radius: [315, 385],
  height: [3, 7.5],
  aspect: [0.9, 1.6],
  sink: 0.1,
  spread: 2,
  gaps: { cycles: 11, from: 0.44 },
  size: { width: 256, height: 256 },
  tint: { from: '#b9bfa4', to: '#c9b89c', light: [0.55, 0.8] },
  seed: 97,
} as const;

export const ATLAS = { columns: 2, rows: 2 } as const;
const VARIANTS = ATLAS.columns * ATLAS.rows;
const CANDIDATES_PER_CARD = 4;
const XYZ = 3;
const GAP_OCTAVES = 3;
const TONE_SPREAD = 7;
const SEEDS = { angle: 0, radius: 1, height: 2, yaw: 3, tone: 4, aspect: 5, variant: 6 } as const;
const OPAQUE = 1;
const LEAF_DARK = srgb('#23241a');
const LEAF_LIT = srgb('#857246');
const BARK = srgb('#2a231b');
const CLEAR: Rgba = [...LEAF_DARK, 0];
const NOISE = {
  edge: tileNoise({ u: 24, v: 12 }, 3, SCRUB_CARDS.seed),
  leaves: tileNoise({ u: 64, v: 32 }, 2, SCRUB_CARDS.seed + 1),
  crown: tileNoise({ u: 20, v: 20 }, 3, TREE_LINE.seed),
} as const;
const SHAPE = { ragged: 0.45, holes: 0.72, litPower: 1.5, speck: 0.3, margin: 0.06 } as const;
const BUSH_BLOBS = {
  count: [3, 5],
  x: [0.26, 0.74],
  y: [0.22, 0.42],
  radius: [0.2, 0.34],
} as const;
const TREE_BLOBS = { count: [3, 5], x: [0.3, 0.7], y: [0.5, 0.72], radius: [0.14, 0.26] } as const;
const TRUNK = { halfWidth: 0.025, top: 0.55 } as const;
const CORNERS = [
  [-0.5, 0],
  [0.5, 0],
  [0.5, 1],
  [-0.5, 1],
] as const;
const FRONT = [0, 1, 2, 0, 2, 3];
const BACK = [0, 2, 1, 0, 3, 2];
const UP = [0, 1, 0] as const;

function ringRadius(ring: Ring, share: number): number {
  const [inner, outer] = ring.radius;
  const power = ring.spread;
  return (inner ** power + share * (outer ** power - inner ** power)) ** (1 / power);
}

function cardAt(ring: Ring, index: number, angle: number): Card {
  const pick = (seed: number) => hash2(index, ring.seed + seed);
  const radius = ringRadius(ring, pick(SEEDS.radius));
  const height = lerp(ring.height[0], ring.height[1], pick(SEEDS.height));
  return {
    x: GROUND.centreX + Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    width: height * lerp(ring.aspect[0], ring.aspect[1], pick(SEEDS.aspect)),
    height,
    yaw: pick(SEEDS.yaw) * Math.PI,
    tone: pick(SEEDS.tone),
    variant: Math.floor(pick(SEEDS.variant) * VARIANTS),
  };
}

function scatter(ring: Ring, keep: (card: Card, angle: number) => boolean): Card[] {
  const cards: Card[] = [];
  const tries = ring.count * CANDIDATES_PER_CARD;
  for (let index = 0; cards.length < ring.count && index < tries; index += 1) {
    const angle = hash2(index, ring.seed + SEEDS.angle) * Math.PI * 2;
    const card = cardAt(ring, index, angle);
    if (keep(card, angle)) cards.push(card);
  }
  return cards;
}

export function scatterScrubCards(): Card[] {
  return scatter(
    SCRUB_CARDS,
    (card) => !nearRun(card.x, card.z) && !onTrack(card.x, card.z, card.width),
  );
}

export function treeLineOpen(angle: number): boolean {
  const { cycles, from } = TREE_LINE.gaps;
  const around = (angle / (Math.PI * 2)) * cycles;
  return fractalNoise(around, 0, GAP_OCTAVES, TREE_LINE.seed) > from;
}

export function scatterTreeLine(): Card[] {
  return scatter(TREE_LINE, (_, angle) => treeLineOpen(angle));
}

function tintOf(tint: CardTint, tone: number): Color {
  const brightness = lerp(tint.light[0], tint.light[1], (tone * TONE_SPREAD) % 1);
  return new Color(tint.from).lerp(new Color(tint.to), tone).multiplyScalar(brightness);
}

function pushCard(card: Card, sink: number, tint: CardTint, buffers: number[][]): void {
  const [positions, normals, colours, uvs, indices] = buffers;
  const colour = tintOf(tint, card.tone);
  const cellU = (card.variant % ATLAS.columns) / ATLAS.columns;
  const cellV = Math.floor(card.variant / ATLAS.columns) / ATLAS.rows;
  [card.yaw, card.yaw + Math.PI / 2].forEach((yaw) => {
    const dx = Math.cos(yaw) * card.width;
    const dz = Math.sin(yaw) * card.width;
    [FRONT, BACK].forEach((winding) => {
      const base = positions.length / XYZ;
      CORNERS.forEach(([across, up]) => {
        positions.push(
          card.x + across * dx,
          GROUND.level - sink + up * card.height,
          card.z + across * dz,
        );
        normals.push(...UP);
        colours.push(colour.r, colour.g, colour.b);
        uvs.push(cellU + (across + 0.5) / ATLAS.columns, cellV + up / ATLAS.rows);
      });
      indices.push(...winding.map((corner) => base + corner));
    });
  });
}

export function cardsGeometry(
  cards: readonly Card[],
  sink: number,
  tint: CardTint,
): BufferGeometry {
  const buffers: number[][] = [[], [], [], [], []];
  cards.forEach((card) => pushCard(card, sink, tint, buffers));
  const [position, normal, color, uv, indices] = buffers;
  return arrayGeometry({ position, normal, color, uv }, indices);
}

interface BlobLayout {
  count: readonly [number, number];
  x: readonly [number, number];
  y: readonly [number, number];
  radius: readonly [number, number];
}

function blobs(variant: number, seed: number, layout: BlobLayout): Blob[] {
  const pick = (index: number, salt: number) => hash2(variant * 13 + index, seed + salt);
  const count = Math.round(lerp(layout.count[0], layout.count[1], pick(0, 0)));
  return Array.from({ length: count }, (_, index) => {
    const radius = lerp(layout.radius[0], layout.radius[1], pick(index, 1));
    const y = lerp(layout.y[0], layout.y[1], pick(index, 2));
    return { x: lerp(layout.x[0], layout.x[1], pick(index, 3)), y, radius };
  });
}

const BUSH_VARIANTS = Array.from({ length: VARIANTS }, (_, variant) =>
  blobs(variant, SCRUB_CARDS.seed, BUSH_BLOBS),
);
const TREE_VARIANTS = Array.from({ length: VARIANTS }, (_, variant) =>
  blobs(variant, TREE_LINE.seed, TREE_BLOBS),
);

function inside(shape: readonly Blob[], x: number, y: number, edge: number): number {
  let best = -Infinity;
  for (const blob of shape) {
    best = Math.max(best, 1 - Math.hypot(x - blob.x, (y - blob.y) * 1.2) / (blob.radius * edge));
  }
  return best;
}

function cell(u: number, v: number): { variant: number; x: number; y: number } {
  const column = Math.min(Math.floor(u * ATLAS.columns), ATLAS.columns - 1);
  const row = Math.min(Math.floor(v * ATLAS.rows), ATLAS.rows - 1);
  return {
    variant: row * ATLAS.columns + column,
    x: u * ATLAS.columns - column,
    y: v * ATLAS.rows - row,
  };
}

function foliage(depth: number, u: number, v: number): Rgba {
  const lit = smoothstep(depth, 0, 1) ** SHAPE.litPower;
  const speck = (NOISE.leaves(u, v) - 0.5) * SHAPE.speck;
  const colour = mixRgb(LEAF_DARK, LEAF_LIT, Math.min(Math.max(lit + speck, 0), 1));
  return [colour[0], colour[1], colour[2], OPAQUE];
}

function inMargin(x: number, y: number): boolean {
  const { margin } = SHAPE;
  return x > margin && x < 1 - margin && y > 0 && y < 1 - margin;
}

export function bushCardShade(u: number, v: number): Rgba {
  const { variant, x, y } = cell(u, v);
  if (!inMargin(x, y)) return CLEAR;
  const edge = 1 + SHAPE.ragged * (NOISE.edge(u, v) - 0.5);
  const depth = inside(BUSH_VARIANTS[variant], x, y, edge);
  if (depth <= 0 || (depth < 1 - SHAPE.holes && NOISE.leaves(u, v) > SHAPE.holes)) return CLEAR;
  return foliage(y / (y + depth), u, v);
}

export function treeCardShade(u: number, v: number): Rgba {
  const { variant, x, y } = cell(u, v);
  if (!inMargin(x, y)) return CLEAR;
  const edge = 1 + SHAPE.ragged * (NOISE.crown(u, v) - 0.5);
  const depth = inside(TREE_VARIANTS[variant], x, y, edge);
  if (depth > 0 && NOISE.crown(u * 2, v * 2) < SHAPE.holes + depth) return foliage(y, u, v);
  if (Math.abs(x - 0.5) < TRUNK.halfWidth && y < TRUNK.top) return [...BARK, OPAQUE];
  return CLEAR;
}

export function bushCardMap(): DataTexture {
  return paintDecal(SCRUB_CARDS.size, bushCardShade);
}

export function treeCardMap(): DataTexture {
  return paintDecal(TREE_LINE.size, treeCardShade);
}

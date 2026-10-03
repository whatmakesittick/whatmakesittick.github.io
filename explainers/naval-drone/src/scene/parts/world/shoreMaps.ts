import { NoColorSpace } from 'three';
import type { Texture } from 'three';
import { clamp } from '@core/math';
import { SLIPWAY } from '../../../model/layout';
import { THEME } from '../../../theme';
import { SLIPWAY_WORKS, slabTop } from '../../geometry/shoreTerrain';
import { canvasTexture, mottle, seededRandom } from '../surfaces';

type Pen = CanvasRenderingContext2D;
type Span = readonly [low: number, high: number];

export const SLIPWAY_MAP = {
  size: [2048, 512] as const,
  x: [SLIPWAY_WORKS.apron.x[0], SLIPWAY.x[1]] as const,
  z: SLIPWAY_WORKS.apron.z,
  sideBand: [2.5, 3.7] as const,
  plainX: [-20, -12] as const,
  kerbWidth: 0.25,
  groove: {
    pitch: 0.15,
    width: 0.025,
    dark: 'rgba(40, 40, 36, 0.38)',
    lip: 'rgba(255, 255, 250, 0.14)',
  },
  joints: { x: [-25], z: [0], width: 0.02, colour: 'rgba(48, 48, 44, 0.6)' },
  mottle: { cells: [240, 60] as const, strength: 0.08, seed: 41 },
  speckles: { count: 9000, size: 1.4, alpha: 0.07, seed: 43 },
  wetLevel: 0.3,
  wetFade: 0.35,
  wetTone: '#7c7b75',
  tideLine: { width: 0.25, colour: 'rgba(50, 52, 40, 0.35)' },
  algaeLevel: 0.08,
  algaeFade: 0.45,
  algaeTone: '#76825c',
  algaeBlots: {
    count: 2600,
    size: [0.015, 0.06] as const,
    colour: 'rgba(52, 70, 34, 0.16)',
    seed: 47,
  },
  stains: { count: 30, size: [0.2, 0.8] as const, colour: 'rgba(60, 58, 50, 0.04)', seed: 53 },
  roughness: { size: 256, dry: 0.92, wet: 0.5, algae: 0.38 },
} as const;

export const GRAIN_MAP = {
  size: 512,
  base: '#f2f2f2',
  mottle: { cells: [40, 40] as const, strength: 0.12, seed: 61 },
  speckles: { count: 26000, size: 1, alpha: 0.07, seed: 67 },
} as const;

export const GRASS_MAP = {
  size: [256, 128] as const,
  blades: 54,
  spread: [0.12, 0.88] as const,
  lean: 0.22,
  reach: [0.45, 0.95] as const,
  width: [1.4, 3.2] as const,
  bend: 0.35,
  tones: ['#d7cd9c', '#b9b07a', '#9fa06a', '#c9bd84', '#8d9160'] as const,
  seed: 83,
} as const;

export const PAD_MAP = {
  size: 512,
  tile: 4,
  base: THEME.concrete,
  mottle: { cells: [40, 40] as const, strength: 0.07, seed: 71 },
  joint: { width: 3, colour: 'rgba(52, 52, 48, 0.7)' },
  stains: { count: 10, size: [0.1, 0.3] as const, colour: 'rgba(70, 66, 58, 0.05)', seed: 73 },
  speckles: { count: 3000, size: 1.2, alpha: 0.06, seed: 79 },
} as const;

export const RADOME_MAP = {
  size: [512, 256] as const,
  base: '#ffffff',
  panels: { around: 18, rows: 7, seam: 'rgba(160, 166, 172, 0.22)', width: 1, stagger: 0.5 },
  grime: { from: 0, to: 0.22, colour: 'rgba(140, 132, 116, 0.35)' },
} as const;

export const MESH_MAP = {
  size: 128,
  diamonds: 5,
  wire: 2.5,
  colour: '#ffffff',
} as const;

const DUST = ['#000000', '#ffffff'] as const;
const WHITE = '#ffffff';
const CLEAR = 'rgba(255, 255, 255, 0)';
const OPAQUE_ALPHA = 1;
const BYTE = 255;
const PIXEL_CENTRE = 0.5;
const BLOT_ROUNDNESS: Span = [0.4, 1];

function between(random: () => number, [low, high]: Span): number {
  return low + random() * (high - low);
}

function speckle(
  context: Pen,
  width: number,
  height: number,
  { count, size, alpha, seed }: { count: number; size: number; alpha: number; seed: number },
): void {
  const random = seededRandom(seed);
  context.globalAlpha = alpha;
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = DUST[Math.floor(random() * DUST.length)];
    context.fillRect(random() * width, random() * height, size, size);
  }
  context.globalAlpha = OPAQUE_ALPHA;
}

function blots(
  context: Pen,
  area: { x: number; y: number; width: number; height: number },
  scale: number,
  {
    count,
    size,
    colour,
    seed,
  }: { count: number; size: readonly [number, number]; colour: string; seed: number },
): void {
  const random = seededRandom(seed);
  context.fillStyle = colour;
  for (let index = 0; index < count; index += 1) {
    const radius = between(random, size) * scale;
    context.beginPath();
    context.ellipse(
      area.x + random() * area.width,
      area.y + random() * area.height,
      radius,
      radius * between(random, BLOT_ROUNDNESS),
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

export function grainTexture(): Texture {
  const { size, base, speckles } = GRAIN_MAP;
  return canvasTexture(
    size,
    size,
    (context, width, height) => {
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);
      mottle(context, width, height, GRAIN_MAP.mottle);
      speckle(context, width, height, speckles);
    },
    true,
  );
}

function slipwayU(x: number): number {
  const [from, to] = SLIPWAY_MAP.x;
  return (x - from) / (to - from);
}

function slipwayV(z: number): number {
  const [from, to] = SLIPWAY_MAP.z;
  return (z - from) / (to - from);
}

export function slipwayUv(x: number, z: number): [number, number] {
  return [slipwayU(x), slipwayV(z)];
}

function slipwayMetre(width: number): number {
  return width / (SLIPWAY_MAP.x[1] - SLIPWAY_MAP.x[0]);
}

function xForLevel(level: number): number {
  const share = (SLIPWAY.top - level) / (SLIPWAY.top - SLIPWAY.foot);
  return SLIPWAY.x[0] + share * (SLIPWAY.x[1] - SLIPWAY.x[0]);
}

function paintGrooves(context: Pen, width: number, height: number): void {
  const { pitch, width: grooveWidth, dark, lip } = SLIPWAY_MAP.groove;
  const metre = slipwayMetre(width);
  const inner = SLIPWAY.z[1] - SLIPWAY_MAP.kerbWidth;
  const top = slipwayV(-inner) * height;
  const bottom = slipwayV(inner) * height;
  for (let x = SLIPWAY.x[0] + pitch; x < SLIPWAY.x[1]; x += pitch) {
    const column = slipwayU(x) * width;
    context.fillStyle = dark;
    context.fillRect(column, top, grooveWidth * metre, bottom - top);
    context.fillStyle = lip;
    context.fillRect(column + grooveWidth * metre, top, 1, bottom - top);
  }
}

function paintJoints(context: Pen, width: number, height: number): void {
  const { joints } = SLIPWAY_MAP;
  const metre = slipwayMetre(width);
  const apronEnd = slipwayU(SLIPWAY.x[0]) * width;
  context.fillStyle = joints.colour;
  joints.x.forEach((x) => context.fillRect(slipwayU(x) * width, 0, joints.width * metre, height));
  joints.z.forEach((z) =>
    context.fillRect(0, slipwayV(z) * height, apronEnd, joints.width * metre),
  );
  context.fillRect(apronEnd, 0, joints.width * metre, height);
}

function levelGradient(context: Pen, width: number, level: number, fade: number, tone: string) {
  const start = slipwayU(xForLevel(level + fade)) * width;
  const end = slipwayU(xForLevel(level - fade)) * width;
  const gradient = context.createLinearGradient(start, 0, end, 0);
  gradient.addColorStop(0, WHITE);
  gradient.addColorStop(1, tone);
  return gradient;
}

function paintWater(context: Pen, width: number, height: number): void {
  const { wetLevel, wetFade, wetTone, algaeLevel, algaeFade, algaeTone, tideLine } = SLIPWAY_MAP;
  const metre = slipwayMetre(width);
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = levelGradient(context, width, wetLevel, wetFade, wetTone);
  context.fillRect(0, 0, width, height);
  context.fillStyle = levelGradient(context, width, algaeLevel, algaeFade, algaeTone);
  context.fillRect(0, 0, width, height);
  context.restore();
  context.fillStyle = tideLine.colour;
  context.fillRect(slipwayU(xForLevel(wetLevel)) * width, 0, tideLine.width * metre, height);
  const algaeStart = slipwayU(xForLevel(algaeLevel + algaeFade)) * width;
  blots(
    context,
    { x: algaeStart, y: 0, width: width - algaeStart, height },
    metre,
    SLIPWAY_MAP.algaeBlots,
  );
}

export function slipwayTexture(): Texture {
  const [columns, rows] = SLIPWAY_MAP.size;
  return canvasTexture(columns, rows, (context, width, height) => {
    const metre = slipwayMetre(width);
    context.fillStyle = THEME.concrete;
    context.fillRect(0, 0, width, height);
    mottle(context, width, height, SLIPWAY_MAP.mottle);
    speckle(context, width, height, SLIPWAY_MAP.speckles);
    blots(context, { x: 0, y: 0, width, height }, metre, SLIPWAY_MAP.stains);
    paintGrooves(context, width, height);
    paintJoints(context, width, height);
    paintWater(context, width, height);
  });
}

function roughnessAt(x: number): number {
  const { wetLevel, wetFade, algaeLevel, algaeFade, roughness } = SLIPWAY_MAP;
  const level = slabTop(x);
  const wet = clamp((wetLevel + wetFade - level) / (2 * wetFade), 0, 1);
  const algae = clamp((algaeLevel + algaeFade - level) / (2 * algaeFade), 0, 1);
  const surface = roughness.dry + (roughness.wet - roughness.dry) * wet;
  return surface + (roughness.algae - surface) * algae;
}

export function slipwayRoughness(): Texture {
  const { size } = SLIPWAY_MAP.roughness;
  const texture = canvasTexture(size, 1, (context, width) => {
    for (let column = 0; column < width; column += 1) {
      const x = SLIPWAY_MAP.x[0] + (column + PIXEL_CENTRE) / slipwayMetre(width);
      const shade = Math.round(roughnessAt(x) * BYTE);
      context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      context.fillRect(column, 0, 1, 1);
    }
  });
  texture.colorSpace = NoColorSpace;
  return texture;
}

export function padTexture(): Texture {
  const { size, base, joint, speckles } = PAD_MAP;
  return canvasTexture(
    size,
    size,
    (context, width, height) => {
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);
      mottle(context, width, height, PAD_MAP.mottle);
      speckle(context, width, height, speckles);
      blots(context, { x: 0, y: 0, width, height }, width / PAD_MAP.tile, PAD_MAP.stains);
      context.fillStyle = joint.colour;
      context.fillRect(0, 0, width, joint.width);
      context.fillRect(0, 0, joint.width, height);
    },
    true,
  );
}

export function radomeTexture(): Texture {
  const [columns, rows] = RADOME_MAP.size;
  const { panels, grime } = RADOME_MAP;
  return canvasTexture(columns, rows, (context, width, height) => {
    context.fillStyle = RADOME_MAP.base;
    context.fillRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, grime.from * height, 0, grime.to * height);
    gradient.addColorStop(0, grime.colour);
    gradient.addColorStop(1, CLEAR);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = panels.seam;
    const rowHeight = height / panels.rows;
    const panelWidth = width / panels.around;
    for (let row = 0; row < panels.rows; row += 1) {
      context.fillRect(0, row * rowHeight, width, panels.width);
      const shift = (row % 2) * panelWidth * panels.stagger;
      for (let column = 0; column <= panels.around; column += 1) {
        context.fillRect(column * panelWidth + shift, row * rowHeight, panels.width, rowHeight);
      }
    }
  });
}

export function meshTexture(): Texture {
  const { size, diamonds, wire, colour } = MESH_MAP;
  return canvasTexture(
    size,
    size,
    (context, width, height) => {
      context.clearRect(0, 0, width, height);
      context.strokeStyle = colour;
      context.lineWidth = wire;
      const step = width / diamonds;
      for (let index = -diamonds; index <= diamonds * 2; index += 1) {
        context.beginPath();
        context.moveTo(index * step, 0);
        context.lineTo(index * step + height, height);
        context.moveTo(index * step, 0);
        context.lineTo(index * step - height, height);
        context.stroke();
      }
    },
    true,
  );
}

function blade(context: Pen, width: number, height: number, random: () => number): void {
  const { spread, lean, reach, width: thickness, bend, tones } = GRASS_MAP;
  const base = between(random, spread) * width;
  const tall = between(random, reach) * height;
  const tip = base + between(random, [-lean, lean]) * width;
  const half = between(random, thickness) / 2;
  const curve = base + (tip - base) * bend;
  context.fillStyle = tones[Math.floor(random() * tones.length)];
  context.beginPath();
  context.moveTo(base - half, height);
  context.quadraticCurveTo(curve - half, height - tall / 2, tip, height - tall);
  context.quadraticCurveTo(curve + half, height - tall / 2, base + half, height);
  context.closePath();
  context.fill();
}

export function grassTexture(): Texture {
  const [columns, rows] = GRASS_MAP.size;
  return canvasTexture(columns, rows, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const random = seededRandom(GRASS_MAP.seed);
    for (let index = 0; index < GRASS_MAP.blades; index += 1) blade(context, width, height, random);
  });
}

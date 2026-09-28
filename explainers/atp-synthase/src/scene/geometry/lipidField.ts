import { lerp } from '@core/math';
import { between } from './random';
import type { Random } from './random';

export type Tint = readonly [red: number, green: number, blue: number];

export interface Field {
  readonly width: number;
  readonly height: number;
  readonly heights: Float32Array;
  readonly tints: Float32Array;
}

export interface Dome {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly tint: Tint;
}

export interface Tail {
  readonly x: number;
  readonly from: number;
  readonly to: number;
  readonly halfWidth: number;
  readonly wave: number;
  readonly waveLength: number;
}

export interface FaceForm {
  readonly size: number;
  readonly headsPerSide: number;
  readonly radiusShare: number;
  readonly radiusVariation: number;
  readonly jitterShare: number;
}

export interface EdgeForm {
  readonly size: number;
  readonly headsPerTile: number;
  readonly thicknessNm: number;
  readonly coreNm: number;
  readonly radiusShare: number;
  readonly jitterShare: number;
  readonly tailOffsetNm: number;
  readonly tailWidthNm: number;
  readonly tailWaveNm: number;
  readonly tailWaveLengthNm: number;
  readonly tailGapNm: number;
}

export const TONE = {
  gap: 0.66,
  head: 1,
  headVariation: 0.1,
  warmth: 0.07,
  headRim: 0.86,
  tail: 0.66,
  tailLift: 0.3,
  core: 0.3,
} as const;

const RGB = 3;
const RGBA = 4;
const BYTE = 255;
const HALF = 0.5;
const PIXEL_CENTRE = 0.5;
const TWO_PI = Math.PI * 2;
const TAIL_TINT: Tint = [TONE.tail, TONE.tail, TONE.tail];

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function grey(tone: number): Tint {
  return [tone, tone, tone];
}

export function createField(width: number, height: number, tint: Tint): Field {
  const tints = new Float32Array(width * height * RGB);
  for (let pixel = 0; pixel < width * height; pixel += 1) tints.set(tint, pixel * RGB);
  return { width, height, heights: new Float32Array(width * height), tints };
}

function raise(field: Field, column: number, row: number, height: number, tint: Tint, shade = 1) {
  const index = row * field.width + column;
  if (height <= field.heights[index]) return;
  field.heights[index] = height;
  const offset = index * RGB;
  tint.forEach((channel, axis) => (field.tints[offset + axis] = channel * shade));
}

export function paintDome(field: Field, dome: Dome, wrapRows: boolean): void {
  const reach = Math.ceil(dome.radius);
  const firstColumn = Math.floor(dome.x) - reach;
  const firstRow = Math.floor(dome.y) - reach;
  for (let row = firstRow; row <= firstRow + reach * 2 + 1; row += 1) {
    if (!wrapRows && (row < 0 || row >= field.height)) continue;
    for (let column = firstColumn; column <= firstColumn + reach * 2 + 1; column += 1) {
      const dx = column + PIXEL_CENTRE - dome.x;
      const dy = row + PIXEL_CENTRE - dome.y;
      const share = (dx * dx + dy * dy) / (dome.radius * dome.radius);
      if (share >= 1) continue;
      const height = Math.sqrt(1 - share);
      const shade = lerp(TONE.headRim, 1, height);
      raise(field, wrap(column, field.width), wrap(row, field.height), height, dome.tint, shade);
    }
  }
}

export function paintTail(field: Field, tail: Tail): void {
  const [bottom, top] = tail.from < tail.to ? [tail.from, tail.to] : [tail.to, tail.from];
  const reach = Math.ceil(tail.halfWidth + tail.wave);
  for (let row = Math.max(0, Math.floor(bottom)); row < Math.min(field.height, top); row += 1) {
    const travelled = Math.abs(row + PIXEL_CENTRE - tail.from);
    const centre = tail.x + tail.wave * Math.sin((TWO_PI * travelled) / tail.waveLength);
    const first = Math.floor(centre) - reach;
    for (let column = first; column <= first + reach * 2; column += 1) {
      const share = Math.abs(column + PIXEL_CENTRE - centre) / tail.halfWidth;
      if (share >= 1) continue;
      raise(field, wrap(column, field.width), row, TONE.tailLift * (1 - share * share), TAIL_TINT);
    }
  }
}

export function headTint(random: Random): Tint {
  const brightness = TONE.head - between(random, 0, TONE.headVariation);
  const warmth = between(random, -TONE.warmth, TONE.warmth);
  return [brightness * (1 + warmth), brightness, brightness * (1 - warmth)];
}

export function faceField(form: FaceForm, random: Random): Field {
  const field = createField(form.size, form.size, grey(TONE.gap));
  const spacing = form.size / form.headsPerSide;
  const jitter = spacing * form.jitterShare;
  const variation = form.radiusVariation;
  for (let row = 0; row < form.headsPerSide; row += 1) {
    const stagger = (row % 2) * HALF;
    for (let column = 0; column < form.headsPerSide; column += 1) {
      paintDome(
        field,
        {
          x: (column + HALF + stagger) * spacing + between(random, -jitter, jitter),
          y: (row + HALF) * spacing + between(random, -jitter, jitter),
          radius: spacing * form.radiusShare * between(random, 1 - variation, 1 + variation),
          tint: headTint(random),
        },
        true,
      );
    }
  }
  return field;
}

export function edgeField(form: EdgeForm, random: Random): Field {
  const field = createField(form.size, form.size, grey(TONE.core));
  const perNm = form.size / form.thicknessNm;
  const middle = form.size * HALF;
  const spacing = form.size / form.headsPerTile;
  const headOffset = (form.thicknessNm * HALF + form.coreNm) * HALF * perNm;
  const radius = spacing * form.radiusShare;
  [-1, 1].forEach((side) => {
    for (let head = 0; head < form.headsPerTile; head += 1) {
      const x = (head + HALF) * spacing + between(random, -1, 1) * spacing * form.jitterShare;
      paintDome(field, { x, y: middle + side * headOffset, radius, tint: headTint(random) }, false);
      [-1, 1].forEach((pair) =>
        paintTail(field, {
          x: x + pair * form.tailOffsetNm * perNm,
          from: middle + side * form.coreNm * perNm,
          to: middle + side * form.tailGapNm * perNm,
          halfWidth: form.tailWidthNm * perNm,
          wave: form.tailWaveNm * perNm,
          waveLength: form.tailWaveLengthNm * perNm,
        }),
      );
    }
  });
  return field;
}

function heightAt(field: Field, column: number, row: number): number {
  const clampedRow = Math.min(field.height - 1, Math.max(0, row));
  return field.heights[clampedRow * field.width + wrap(column, field.width)];
}

function toByte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * BYTE);
}

export function normalPixels(field: Field, strength: number): Uint8Array {
  const pixels = new Uint8Array(field.width * field.height * RGBA);
  for (let row = 0; row < field.height; row += 1) {
    for (let column = 0; column < field.width; column += 1) {
      const dx = (heightAt(field, column + 1, row) - heightAt(field, column - 1, row)) * strength;
      const dy = (heightAt(field, column, row + 1) - heightAt(field, column, row - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (row * field.width + column) * RGBA;
      pixels[index] = toByte((-dx / length) * HALF + HALF);
      pixels[index + 1] = toByte((-dy / length) * HALF + HALF);
      pixels[index + 2] = toByte((1 / length) * HALF + HALF);
      pixels[index + 3] = BYTE;
    }
  }
  return pixels;
}

export function tintPixels(field: Field): Uint8Array {
  const pixels = new Uint8Array(field.width * field.height * RGBA);
  for (let pixel = 0; pixel < field.width * field.height; pixel += 1) {
    for (let axis = 0; axis < RGB; axis += 1) {
      pixels[pixel * RGBA + axis] = toByte(field.tints[pixel * RGB + axis]);
    }
    pixels[pixel * RGBA + RGB] = BYTE;
  }
  return pixels;
}

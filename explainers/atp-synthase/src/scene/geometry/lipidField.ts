import { lerp } from '@core/math';
import { between } from './random';
import type { Random } from './random';

export interface Field {
  readonly width: number;
  readonly height: number;
  readonly heights: Float32Array;
  readonly tones: Float32Array;
}

export interface Dome {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly tone: number;
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
  gap: 0.56,
  head: 1,
  headVariation: 0.08,
  headRim: 0.8,
  tail: 0.66,
  tailLift: 0.3,
  core: 0.3,
} as const;

const RGBA = 4;
const BYTE = 255;
const HALF = 0.5;
const PIXEL_CENTRE = 0.5;
const TWO_PI = Math.PI * 2;

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function createField(width: number, height: number, tone: number): Field {
  return {
    width,
    height,
    heights: new Float32Array(width * height),
    tones: new Float32Array(width * height).fill(tone),
  };
}

function raise(field: Field, column: number, row: number, height: number, tone: number): void {
  const index = row * field.width + column;
  if (height <= field.heights[index]) return;
  field.heights[index] = height;
  field.tones[index] = tone;
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
      const tone = dome.tone * lerp(TONE.headRim, 1, height);
      raise(field, wrap(column, field.width), wrap(row, field.height), height, tone);
    }
  }
}

export function paintTail(field: Field, tail: Tail): void {
  const [bottom, top] = tail.from < tail.to ? [tail.from, tail.to] : [tail.to, tail.from];
  const reach = Math.ceil(tail.halfWidth + tail.wave);
  for (let row = Math.max(0, Math.floor(bottom)); row < Math.min(field.height, top); row += 1) {
    const travelled = Math.abs(row + PIXEL_CENTRE - tail.from);
    const centre = tail.x + tail.wave * Math.sin((TWO_PI * travelled) / tail.waveLength);
    for (
      let column = Math.floor(centre) - reach;
      column <= Math.floor(centre) + reach;
      column += 1
    ) {
      const share = Math.abs(column + PIXEL_CENTRE - centre) / tail.halfWidth;
      if (share >= 1) continue;
      raise(field, wrap(column, field.width), row, TONE.tailLift * (1 - share * share), TONE.tail);
    }
  }
}

function headTone(random: Random): number {
  return TONE.head - between(random, 0, TONE.headVariation);
}

export function faceField(form: FaceForm, random: Random): Field {
  const field = createField(form.size, form.size, TONE.gap);
  const spacing = form.size / form.headsPerSide;
  const jitter = spacing * form.jitterShare;
  for (let row = 0; row < form.headsPerSide; row += 1) {
    for (let column = 0; column < form.headsPerSide; column += 1) {
      const dome = {
        x: (column + HALF) * spacing + between(random, -jitter, jitter),
        y: (row + HALF) * spacing + between(random, -jitter, jitter),
        radius: spacing * form.radiusShare,
        tone: headTone(random),
      };
      paintDome(field, dome, true);
    }
  }
  return field;
}

export function edgeField(form: EdgeForm, random: Random): Field {
  const field = createField(form.size, form.size, TONE.core);
  const perNm = form.size / form.thicknessNm;
  const middle = form.size * HALF;
  const spacing = form.size / form.headsPerTile;
  const headOffset = (form.thicknessNm * HALF + form.coreNm) * HALF * perNm;
  const radius = spacing * form.radiusShare;
  [-1, 1].forEach((side) => {
    for (let head = 0; head < form.headsPerTile; head += 1) {
      const x = (head + HALF) * spacing + between(random, -1, 1) * spacing * form.jitterShare;
      paintDome(field, { x, y: middle + side * headOffset, radius, tone: headTone(random) }, false);
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

export function normalPixels(field: Field, strength: number): Uint8Array {
  const pixels = new Uint8Array(field.width * field.height * RGBA);
  for (let row = 0; row < field.height; row += 1) {
    for (let column = 0; column < field.width; column += 1) {
      const dx = (heightAt(field, column + 1, row) - heightAt(field, column - 1, row)) * strength;
      const dy = (heightAt(field, column, row + 1) - heightAt(field, column, row - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (row * field.width + column) * RGBA;
      pixels[index] = Math.round(((-dx / length) * HALF + HALF) * BYTE);
      pixels[index + 1] = Math.round(((-dy / length) * HALF + HALF) * BYTE);
      pixels[index + 2] = Math.round(((1 / length) * HALF + HALF) * BYTE);
      pixels[index + 3] = BYTE;
    }
  }
  return pixels;
}

export function tonePixels(field: Field): Uint8Array {
  const pixels = new Uint8Array(field.width * field.height * RGBA);
  field.tones.forEach((tone, pixel) => {
    const grey = Math.round(Math.min(1, Math.max(0, tone)) * BYTE);
    pixels.fill(grey, pixel * RGBA, pixel * RGBA + RGBA - 1);
    pixels[pixel * RGBA + RGBA - 1] = BYTE;
  });
  return pixels;
}

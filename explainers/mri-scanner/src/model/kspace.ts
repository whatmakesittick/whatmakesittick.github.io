import { clamp } from '@core/math';
import FFT from 'fft.js';
import type { FieldId, WeightingId } from '../ids';
import { MODEL_SIZE } from './constants';
import { phantomImage } from './phantom';

interface ComplexTransform {
  transform(out: Float64Array, data: Float64Array): void;
  inverseTransform(out: Float64Array, data: Float64Array): void;
}

type Direction = 'forward' | 'inverse';

const SIZE = MODEL_SIZE;
const HALF = SIZE / 2;
const PARTS = 2;
const PIXELS = SIZE * SIZE;

const transformer: ComplexTransform = new FFT(SIZE);
const lineIn = new Float64Array(SIZE * PARTS);
const lineOut = new Float64Array(SIZE * PARTS);

const kspaceCache = new Map<string, Float64Array>();
const pictureCache = new Map<string, Float32Array>();
const displayCache = new Map<string, Float32Array>();

function memoised<T>(cache: Map<string, T>, key: string, build: () => T): T {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const built = build();
  cache.set(key, built);
  return built;
}

function transformLine(
  data: Float64Array,
  start: number,
  stride: number,
  direction: Direction,
): void {
  for (let step = 0; step < SIZE; step += 1) {
    const at = (start + step * stride) * PARTS;
    lineIn[step * PARTS] = data[at];
    lineIn[step * PARTS + 1] = data[at + 1];
  }
  if (direction === 'forward') transformer.transform(lineOut, lineIn);
  else transformer.inverseTransform(lineOut, lineIn);
  for (let step = 0; step < SIZE; step += 1) {
    const at = (start + step * stride) * PARTS;
    data[at] = lineOut[step * PARTS];
    data[at + 1] = lineOut[step * PARTS + 1];
  }
}

function transform2d(source: Float64Array, direction: Direction): Float64Array {
  const data = Float64Array.from(source);
  for (let row = 0; row < SIZE; row += 1) transformLine(data, row * SIZE, 1, direction);
  for (let column = 0; column < SIZE; column += 1) transformLine(data, column, SIZE, direction);
  return data;
}

function magnitudeAt(data: Float64Array, pixel: number): number {
  return Math.hypot(data[pixel * PARTS], data[pixel * PARTS + 1]);
}

function storedRow(offset: number): number {
  return (offset + SIZE) % SIZE;
}

function filledRows(linesFilled: number): ReadonlySet<number> {
  const count = clamp(Math.floor(linesFilled), 0, SIZE);
  return new Set(lineOrder().slice(0, count).map(storedRow));
}

function rowOf(pixel: number): number {
  return Math.floor(pixel / SIZE);
}

function keyOf(...parts: readonly (string | number)[]): string {
  return parts.join('|');
}

export function kspaceOf(image: Float32Array): Float64Array {
  const complex = new Float64Array(PIXELS * PARTS);
  image.forEach((value, pixel) => {
    complex[pixel * PARTS] = value;
  });
  return transform2d(complex, 'forward');
}

export function lineOrder(): number[] {
  const pairs = Array.from({ length: HALF - 1 }, (_, index) => [index + 1, -(index + 1)]);
  return [0, ...pairs.flat(), -HALF];
}

export function reconstruct(kspace: Float64Array, linesFilled: number): Float32Array {
  const rows = filledRows(linesFilled);
  const masked = kspace.map((value, index) =>
    rows.has(rowOf(Math.floor(index / PARTS))) ? value : 0,
  );
  const image = transform2d(masked, 'inverse');
  const picture = Float32Array.from({ length: PIXELS }, (_, pixel) => magnitudeAt(image, pixel));
  const brightest = Math.max(...picture);
  return brightest === 0 ? picture : picture.map((value) => value / brightest);
}

function kspaceFor(field: FieldId, weighting: WeightingId): Float64Array {
  return memoised(kspaceCache, keyOf(field, weighting), () =>
    kspaceOf(phantomImage(field, weighting)),
  );
}

export function pictureFor(
  field: FieldId,
  weighting: WeightingId,
  linesFilled: number,
): Float32Array {
  return memoised(pictureCache, keyOf(field, weighting, linesFilled), () =>
    reconstruct(kspaceFor(field, weighting), linesFilled),
  );
}

function shiftedPixel(pixel: number): number {
  const row = (rowOf(pixel) + HALF) % SIZE;
  const column = ((pixel % SIZE) + HALF) % SIZE;
  return row * SIZE + column;
}

function logDisplay(kspace: Float64Array, rows: ReadonlySet<number>): Float32Array {
  const levels = Float32Array.from({ length: PIXELS }, (_, pixel) =>
    Math.log1p(magnitudeAt(kspace, pixel)),
  );
  const top = Math.max(...levels);
  return Float32Array.from({ length: PIXELS }, (_, pixel) => {
    const source = shiftedPixel(pixel);
    return rows.has(rowOf(source)) && top > 0 ? levels[source] / top : 0;
  });
}

export function kspaceDisplay(
  field: FieldId,
  weighting: WeightingId,
  linesFilled: number,
): Float32Array {
  return memoised(displayCache, keyOf(field, weighting, linesFilled), () =>
    logDisplay(kspaceFor(field, weighting), filledRows(linesFilled)),
  );
}

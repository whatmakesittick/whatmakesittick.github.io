import { describe, expect, it } from 'vitest';
import { MODEL_SIZE } from './constants';
import { kspaceDisplay, kspaceOf, lineOrder, pictureFor, reconstruct } from './kspace';
import { phantomImage } from './phantom';

const PARTIAL_LINES = 16;
const TOLERANCE = 1e-5;
const CENTROID_TOLERANCE = 0.5;
const HALF = MODEL_SIZE / 2;

function normalised(image: Float32Array): Float32Array {
  const brightest = Math.max(...image);
  return image.map((value) => value / brightest);
}

function edgeEnergy(image: Float32Array): number {
  let energy = 0;
  for (let row = 0; row < MODEL_SIZE; row += 1) {
    for (let column = 1; column < MODEL_SIZE; column += 1) {
      const pixel = row * MODEL_SIZE + column;
      energy += (image[pixel] - image[pixel - 1]) ** 2;
      if (row > 0) energy += (image[pixel] - image[pixel - MODEL_SIZE]) ** 2;
    }
  }
  return energy;
}

function centroid(image: Float32Array): [x: number, y: number] {
  let total = 0;
  let x = 0;
  let y = 0;
  image.forEach((value, pixel) => {
    total += value;
    x += value * (pixel % MODEL_SIZE);
    y += value * Math.floor(pixel / MODEL_SIZE);
  });
  return [x / total, y / total];
}

describe('line order', () => {
  it('fills k-space from the centre outwards', () => {
    const order = lineOrder();
    expect(order.slice(0, 5)).toEqual([0, 1, -1, 2, -2]);
    expect(order).toHaveLength(MODEL_SIZE);
    expect(new Set(order).size).toBe(MODEL_SIZE);
    expect(order.at(-1)).toBe(-HALF);
  });
});

describe('reconstruction', () => {
  const phantom = phantomImage('field15', 't2');
  const kspace = kspaceOf(phantom);

  it('gives back the phantom from a full k-space', () => {
    const picture = reconstruct(kspace, MODEL_SIZE);
    const expected = normalised(phantom);
    picture.forEach((value, pixel) =>
      expect(Math.abs(value - expected[pixel])).toBeLessThan(TOLERANCE),
    );
  });

  it('blurs but does not move the head with only the middle lines', () => {
    const full = reconstruct(kspace, MODEL_SIZE);
    const partial = reconstruct(kspace, PARTIAL_LINES);
    expect(edgeEnergy(partial)).toBeLessThan(edgeEnergy(full));
    const [fullX, fullY] = centroid(full);
    const [partialX, partialY] = centroid(partial);
    expect(Math.abs(partialX - fullX)).toBeLessThan(CENTROID_TOLERANCE);
    expect(Math.abs(partialY - fullY)).toBeLessThan(CENTROID_TOLERANCE);
  });

  it('stays dark before the first line', () => {
    expect(Math.max(...reconstruct(kspace, 0))).toBe(0);
  });
});

describe('memoised pictures', () => {
  it('returns the same array for the same settings', () => {
    expect(pictureFor('field30', 't1', PARTIAL_LINES)).toBe(
      pictureFor('field30', 't1', PARTIAL_LINES),
    );
    expect(kspaceDisplay('field30', 't1', PARTIAL_LINES)).toBe(
      kspaceDisplay('field30', 't1', PARTIAL_LINES),
    );
  });

  it('shows filled lines around the centre on a 0 to 1 scale', () => {
    const display = kspaceDisplay('field15', 't2', 1);
    expect(display[HALF * MODEL_SIZE + HALF]).toBe(1);
    expect(display[0]).toBe(0);
    expect(display[(HALF + 1) * MODEL_SIZE + HALF]).toBe(0);
    for (const value of display) expect(value).toBeLessThanOrEqual(1);
  });
});

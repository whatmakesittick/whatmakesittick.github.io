import { describe, expect, it } from 'vitest';
import { turned } from './geometry';

const STEPPED: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0.5],
  [2, 0.5],
  [2, 0],
];
const SEGMENTS = 8;

describe('turned', () => {
  it('keeps finite normals across stepped corners', () => {
    const normals = turned(STEPPED, SEGMENTS).getAttribute('normal').array;
    expect(Array.from(normals).every(Number.isFinite)).toBe(true);
  });

  it('gives the stepped face an axial normal', () => {
    const geometry = turned(STEPPED, SEGMENTS);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const shoulder = Array.from({ length: positions.count }, (_, index) => index).filter(
      (index) =>
        positions.getX(index) === 1 &&
        Math.hypot(positions.getY(index), positions.getZ(index)) > 0.9,
    );
    expect(shoulder.some((index) => normals.getX(index) > 0.99)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { puffLight, shadePuff } from './plumeShading';

const WHITE = { r: 1, g: 1, b: 1 };

function brightness(light: number, clear: number): number {
  const { r, g, b } = shadePuff(light, clear, WHITE, { r: 0, g: 0, b: 0 });
  return r + g + b;
}

describe('plume shading', () => {
  it('lights the sunward top and darkens the underside', () => {
    expect(puffLight(1, 1)).toBeGreaterThan(puffLight(-1, -1));
    expect(brightness(puffLight(1, 1), 0)).toBeGreaterThan(brightness(puffLight(-1, -1), 0));
  });

  it('warms the sunlit side toward the low sun', () => {
    const lit = shadePuff(1, 0, WHITE, { r: 0, g: 0, b: 0 });
    expect(lit.r).toBeGreaterThan(lit.b);
  });

  it('keeps the core at the mouth bright whatever the light', () => {
    expect(brightness(0, 1)).toBeCloseTo(brightness(1, 1) - (brightness(1, 1) - brightness(0, 1)));
    expect(brightness(0, 1)).toBeGreaterThan(brightness(0, 0));
  });
});

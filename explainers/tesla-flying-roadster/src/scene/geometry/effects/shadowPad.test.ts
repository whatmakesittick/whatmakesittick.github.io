import { describe, expect, it } from 'vitest';
import { shadowPadAlpha, shadowPadTexture } from './shadowPad';
import type { ShadowPadLayout } from './shadowPad';

const LAYOUT: ShadowPadLayout = {
  size: [6, 3.4],
  pad: [4.5, 1.9],
  padCorner: 0.45,
  padBlur: 0.55,
  padAlpha: 0.88,
  spots: [
    [1.4, 0.84],
    [-1.4, -0.84],
  ],
  spot: [0.48, 0.3],
  spotAlpha: 0.95,
};

describe('shadow pad', () => {
  it('is firm and dark right under the body', () => {
    expect(shadowPadAlpha(0, 0, LAYOUT)).toBeCloseTo(LAYOUT.padAlpha);
  });

  it('fades softly to nothing beyond the footprint', () => {
    const inside = shadowPadAlpha(2.0, 0, LAYOUT);
    const edge = shadowPadAlpha(2.25, 0, LAYOUT);
    const outside = shadowPadAlpha(2.6, 0, LAYOUT);
    expect(inside).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThan(outside);
    expect(shadowPadAlpha(2.95, 1.65, LAYOUT)).toBe(0);
  });

  it('darkens the ground under each tyre', () => {
    expect(shadowPadAlpha(1.4, 0.84, LAYOUT)).toBeGreaterThan(shadowPadAlpha(0, 0, LAYOUT));
    expect(shadowPadAlpha(1.4, 0.84, LAYOUT)).toBeGreaterThan(shadowPadAlpha(1.4, -0.84, LAYOUT));
  });

  it('bakes the pad into a black texture that carries only alpha', () => {
    const texture = shadowPadTexture(LAYOUT);
    const { width, height } = texture.image;
    const data = texture.image.data as Uint8Array;
    const centre = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
    expect(Array.from(data.slice(centre, centre + 3))).toEqual([0, 0, 0]);
    expect(data[centre + 3]).toBeGreaterThan(200);
    expect(data[3]).toBe(0);
  });
});

import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { gradientTint } from './heatTint';

describe('heat tint', () => {
  it('blends the stops by height and holds the ends', () => {
    const tint = gradientTint([
      [-100, '#000000'],
      [0, '#ffffff'],
    ]);
    const colour = new Color();
    tint(1, -200, colour);
    expect(colour.r).toBe(0);
    tint(1, 50, colour);
    expect(colour.r).toBe(1);
    tint(1, -50, colour);
    expect(colour.r).toBeCloseTo(0.5);
  });
});

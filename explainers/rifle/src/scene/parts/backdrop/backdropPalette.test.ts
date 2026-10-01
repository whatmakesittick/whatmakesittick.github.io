import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { THEME } from '../../../theme';
import { BACKDROP, COMPENSATOR } from '../../constants';
import { domeColour, laneLights, lightness, warmth } from './backdropPalette';

const PAGE = new Color(THEME.background);

describe('backdrop palette', () => {
  it('blends the dome stops by height and holds the ends', () => {
    const stops = [
      { height: 0, colour: '#000000' },
      { height: 1, colour: '#ffffff' },
    ];
    expect(domeColour(-1, stops).r).toBe(0);
    expect(domeColour(0.5, stops).r).toBeCloseTo(0.5);
    expect(domeColour(2, stops).r).toBe(1);
  });

  it('keeps the upper dome close to the page background and darkens it towards the zenith', () => {
    const upper = domeColour(0.45);
    expect(Math.abs(lightness(upper) - lightness(PAGE))).toBeLessThan(0.02);
    expect(lightness(domeColour(1))).toBeLessThan(lightness(upper));
  });

  it('lifts a faint warm band at the horizon above the blue grey just over it', () => {
    const horizon = domeColour(0);
    const above = domeColour(0.08);
    expect(lightness(horizon)).toBeGreaterThan(lightness(above));
    expect(warmth(horizon)).toBeGreaterThan(warmth(above));
    expect(lightness(horizon)).toBeLessThan(0.1);
  });

  it('hangs the lane lights far beyond the rifle, just above the bore line and inside the dome', () => {
    for (const [x, y, z] of laneLights()) {
      expect(Math.hypot(x - COMPENSATOR.x[1], z)).toBeGreaterThan(4000);
      expect(z).toBeLessThan(0);
      expect(y / Math.hypot(x, z)).toBeLessThan(0.15);
      expect(y).toBeGreaterThan(0);
      expect(Math.hypot(x, y, z)).toBeLessThan(BACKDROP.dome.radius);
    }
  });
});

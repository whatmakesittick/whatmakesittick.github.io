import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { colourAt, horizonDip, skyPalette } from './skyPalette';

function lightness(colour: Color): number {
  return colour.r + colour.g + colour.b;
}

describe('sky palette', () => {
  it('blends colour stops by altitude and holds the ends', () => {
    const stops = [
      [0, '#000000'],
      [10, '#ffffff'],
    ] as const;
    expect(colourAt(stops, -5, new Color()).r).toBe(0);
    expect(colourAt(stops, 5, new Color()).r).toBeCloseTo(0.5);
    expect(colourAt(stops, 50, new Color()).r).toBe(1);
  });

  it('drops the horizon further below the camera as the booster climbs', () => {
    expect(horizonDip(0)).toBe(0);
    expect(horizonDip(10)).toBeGreaterThan(0);
    expect(horizonDip(52)).toBeGreaterThan(horizonDip(10));
  });

  it('darkens the sky, thins the haze and brings out the stars with height', () => {
    const pad = skyPalette(0);
    const climb = skyPalette(15);
    const high = skyPalette(52);
    expect(lightness(high.zenith)).toBeLessThan(lightness(climb.zenith));
    expect(lightness(climb.zenith)).toBeLessThan(lightness(pad.zenith));
    expect(high.haze).toBeLessThan(pad.haze);
    expect(high.stars).toBeGreaterThan(pad.stars);
    expect(high.stars).toBeCloseTo(1);
  });

  it('shows the coast and its lights only near the ground and the blue limb only high up', () => {
    expect(skyPalette(0).lights).toBe(1);
    expect(skyPalette(5).lights).toBe(0);
    expect(skyPalette(0).shore).toBe(1);
    expect(skyPalette(40).shore).toBe(0);
    expect(lightness(skyPalette(52).limb)).toBeGreaterThan(lightness(skyPalette(1).limb));
  });
});

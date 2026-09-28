import { describe, expect, it } from 'vitest';
import { DAY_START_MIN, SOLAR_NOON_MIN, SUNRISE_MIN, SUNSET_MIN } from '../../../model';
import { skyPalette } from './palette';

function brightness(color: { r: number; g: number; b: number }): number {
  return color.r + color.g + color.b;
}

describe('sky palette', () => {
  it('is deep navy before dawn and bright blue at noon', () => {
    const night = skyPalette(DAY_START_MIN);
    const noon = skyPalette(SOLAR_NOON_MIN);
    expect(night.zenith.b).toBeGreaterThan(night.zenith.r);
    expect(brightness(night.zenith)).toBeLessThan(0.1);
    expect(noon.zenith.b).toBeGreaterThan(noon.zenith.r);
    expect(brightness(noon.horizon)).toBeGreaterThan(brightness(night.horizon) * 5);
  });

  it('warms the horizon at sunrise and sunset', () => {
    [SUNRISE_MIN + 5, SUNSET_MIN - 5].forEach((minute) => {
      const palette = skyPalette(minute);
      expect(palette.horizon.r).toBeGreaterThan(palette.horizon.b);
      expect(palette.strength).toBeGreaterThan(0.8);
    });
  });

  it('turns violet after sunset', () => {
    const dusk = skyPalette(SUNSET_MIN + 15);
    expect(dusk.horizon.b).toBeGreaterThan(dusk.horizon.g);
  });
});

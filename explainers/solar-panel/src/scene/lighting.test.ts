import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { DAY_START_MIN, SOLAR_NOON_MIN, SUNRISE_MIN, SUNSET_MIN } from '../model';
import { daylight, keyLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('daylight', () => {
  it('puts the key light in the sun, east in the morning and south and high at noon', () => {
    const morning = keyLight(SUNRISE_MIN + 60).direction;
    const noon = keyLight(SOLAR_NOON_MIN).direction;
    const evening = keyLight(SUNSET_MIN - 60).direction;
    expect(morning.x).toBeGreaterThan(0.5);
    expect(evening.x).toBeLessThan(-0.5);
    expect(noon.z).toBeGreaterThan(0.5);
    expect(noon.y).toBeGreaterThan(0.7);
    expect(Math.abs(noon.x)).toBeLessThan(1e-9);
  });

  it('warms near the horizon, dims at night but never goes dark or below the ground', () => {
    const low = keyLight(SUNRISE_MIN + 15);
    const noon = keyLight(SOLAR_NOON_MIN);
    const night = keyLight(DAY_START_MIN);
    expect(low.color.r - low.color.b).toBeGreaterThan(noon.color.r - noon.color.b);
    expect(night.intensity).toBeLessThan(noon.intensity / 3);
    expect(night.intensity).toBeGreaterThan(0);
    expect(night.direction.y).toBeGreaterThan(0);
    expect(night.color.b).toBeGreaterThan(night.color.r);
  });

  it('follows the minute and puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const light = daylight(lights);
    light.follow(SOLAR_NOON_MIN);
    expect(lights.key.position.z).toBeGreaterThan(0);
    expect(lights.key.intensity).toBeGreaterThan(1);
    expect(lights.fill.intensity).not.toBe(1);
    light.restore();
    Object.values(lights).forEach((shellLight) => {
      expect(shellLight.intensity).toBe(1);
      expect(shellLight.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

import type { Color } from 'three';
import { DirectionalLight, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SKY } from './constants';
import { reaperLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

function warmth(colour: Color): number {
  return colour.r - colour.b;
}

describe('reaper light', () => {
  it('keys warm and low from the sun side of the sky', () => {
    const lights = shellLights();
    reaperLight(lights);
    const key = lights.key.position.clone().normalize();
    const sun = new Vector3(...SKY.sunDirection).setY(0).normalize();
    expect(key.dot(sun)).toBeGreaterThan(0.6);
    expect(key.y).toBeGreaterThan(0);
    expect(key.y).toBeLessThan(0.5);
    expect(warmth(lights.key.color)).toBeGreaterThan(0);
  });

  it('fills cool from high in the sky and rims from the far side', () => {
    const lights = shellLights();
    reaperLight(lights);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(lights.fill.position.clone().normalize().y).toBeGreaterThan(0.6);
    expect(lights.fill.intensity).toBeLessThan(lights.key.intensity);
    expect(
      lights.rim.position.clone().normalize().dot(lights.key.position.clone().normalize()),
    ).toBeLessThan(0);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = reaperLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

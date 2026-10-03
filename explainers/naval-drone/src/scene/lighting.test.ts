import type { Color } from 'three';
import { DirectionalLight, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SUN_DIRECTION } from './constants';
import { navalDroneLight } from './lighting';

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

describe('naval drone light', () => {
  it('keys warm and low from the rising sun', () => {
    const lights = shellLights();
    navalDroneLight(lights);
    const key = lights.key.position.clone().normalize();
    expect(key.dot(new Vector3(...SUN_DIRECTION).normalize())).toBeGreaterThan(0.99);
    expect(key.y).toBeGreaterThan(0);
    expect(key.y).toBeLessThan(0.2);
    expect(warmth(lights.key.color)).toBeGreaterThan(0);
  });

  it('fills cool from the sky and rims cold and low from the far side', () => {
    const lights = shellLights();
    navalDroneLight(lights);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(lights.fill.position.clone().normalize().y).toBeGreaterThan(0.6);
    expect(lights.fill.intensity).toBeLessThan(lights.key.intensity);
    const rim = lights.rim.position.clone().normalize();
    expect(rim.dot(lights.key.position.clone().normalize())).toBeLessThan(0);
    expect(rim.y).toBeLessThan(0.3);
    expect(warmth(lights.rim.color)).toBeLessThan(0);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = navalDroneLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { heartLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('heart light', () => {
  it('keys warm from the front left above and fills cool from the right', () => {
    const lights = shellLights();
    heartLight(lights);
    expect(lights.key.position.x).toBeLessThan(0);
    expect(lights.key.position.y).toBeGreaterThan(0);
    expect(lights.key.position.z).toBeGreaterThan(0);
    expect(lights.key.color.r).toBeGreaterThan(lights.key.color.b);
    expect(lights.fill.position.x).toBeGreaterThan(0);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(lights.fill.intensity).toBeLessThan(lights.key.intensity);
  });

  it('rims the heart from behind', () => {
    const lights = shellLights();
    heartLight(lights);
    expect(lights.rim.position.z).toBeLessThan(0);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = heartLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

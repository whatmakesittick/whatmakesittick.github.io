import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { raptorLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('raptor light', () => {
  it('keys warm from the front right above and fills cool from the left', () => {
    const lights = shellLights();
    raptorLight(lights);
    expect(lights.key.position.x).toBeGreaterThan(0);
    expect(lights.key.position.y).toBeGreaterThan(0);
    expect(lights.key.position.z).toBeGreaterThan(0);
    expect(lights.key.color.r).toBeGreaterThan(lights.key.color.b);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(lights.fill.intensity).toBeLessThan(lights.key.intensity);
  });

  it('rims the steel edges strongly from behind', () => {
    const lights = shellLights();
    raptorLight(lights);
    expect(lights.rim.position.z).toBeLessThan(0);
    expect(lights.rim.intensity).toBeGreaterThanOrEqual(lights.key.intensity);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = raptorLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

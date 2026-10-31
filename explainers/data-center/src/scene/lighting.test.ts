import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { LIGHT_RIG } from './constants';
import { dataCenterLight } from './lighting';

const OVERCAST_HEIGHT = 0.4;
const SKY_FILL_HEIGHT = 0.6;

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

function direction(light: DirectionalLight) {
  return light.position.clone().normalize();
}

describe('data center light', () => {
  it('keys a soft warm light high from the south-west', () => {
    const lights = shellLights();
    dataCenterLight(lights);
    const key = direction(lights.key);
    expect(key.x).toBeLessThan(0);
    expect(key.z).toBeGreaterThan(0);
    expect(key.y).toBeGreaterThan(OVERCAST_HEIGHT);
    expect(lights.key.color.r).toBeGreaterThan(lights.key.color.g);
    expect(lights.key.color.g).toBeGreaterThan(lights.key.color.b);
  });

  it('fills cool from the sky on the shade side and rims from the north', () => {
    const lights = shellLights();
    dataCenterLight(lights);
    const key = direction(lights.key);
    expect(direction(lights.fill).y).toBeGreaterThan(SKY_FILL_HEIGHT);
    expect(direction(lights.fill).dot(key)).toBeLessThan(0);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(direction(lights.rim).z).toBeLessThan(0);
    expect(direction(lights.rim).dot(key)).toBeLessThan(0);
    expect(lights.fill.intensity).toBeLessThan(lights.rim.intensity);
    expect(lights.rim.intensity).toBeLessThan(lights.key.intensity);
  });

  it('places every light at the rig distance', () => {
    const lights = shellLights();
    dataCenterLight(lights);
    Object.values(lights).forEach((light) =>
      expect(light.position.length()).toBeCloseTo(LIGHT_RIG.distance),
    );
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = dataCenterLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

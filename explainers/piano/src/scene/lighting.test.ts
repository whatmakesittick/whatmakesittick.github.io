import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { LIGHT_RIG, pianoLight } from './lighting';

const KEY_TO_FILL = 6;

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

describe('piano light', () => {
  it('keys a warm light from above, in front of the player and to the left', () => {
    const lights = shellLights();
    pianoLight(lights);
    const key = direction(lights.key);
    expect(key.x).toBeLessThan(0);
    expect(key.z).toBeGreaterThan(0);
    expect(key.y).toBeGreaterThan(Math.abs(key.x));
    expect(lights.key.color.r).toBeGreaterThan(lights.key.color.g);
    expect(lights.key.color.g).toBeGreaterThan(lights.key.color.b);
  });

  it('fills cool from the treble side and rims from behind the tail', () => {
    const lights = shellLights();
    pianoLight(lights);
    expect(direction(lights.fill).x).toBeGreaterThan(0);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.r);
    expect(direction(lights.rim).z).toBeLessThan(0);
    expect(direction(lights.rim).y).toBeGreaterThan(0);
    expect(direction(lights.rim).dot(direction(lights.fill))).toBeLessThan(0);
    expect(lights.fill.intensity).toBeLessThan(lights.rim.intensity);
  });

  it('rakes the key across the cut so tops and edges outshine the cut faces', () => {
    const lights = shellLights();
    pianoLight(lights);
    const key = direction(lights.key);
    expect(key.y).toBeGreaterThan(2 * Math.abs(key.x));
    expect(key.z).toBeGreaterThan(Math.abs(key.x));
    expect(lights.key.intensity).toBeGreaterThan(KEY_TO_FILL * lights.fill.intensity);
  });

  it('places every light at the rig distance', () => {
    const lights = shellLights();
    pianoLight(lights);
    Object.values(lights).forEach((light) =>
      expect(light.position.length()).toBeCloseTo(LIGHT_RIG.distance),
    );
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = pianoLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

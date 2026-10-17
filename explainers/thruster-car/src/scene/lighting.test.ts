import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { thrusterCarLight } from './lighting';

const SHELL_KEY_INTENSITY = 2.4;
const VIOLET_RED_SHARE = 0.9;

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('thruster car light', () => {
  it('keys warm and low from behind the start', () => {
    const lights = shellLights();
    thrusterCarLight(lights);
    const key = lights.key.position.clone().normalize();
    expect(key.x).toBeLessThan(-0.6);
    expect(key.y).toBeGreaterThan(0.2);
    expect(key.y).toBeLessThan(0.5);
    expect(lights.key.color.r).toBeGreaterThan(lights.key.color.g);
    expect(lights.key.color.g).toBeGreaterThan(lights.key.color.b);
    expect(lights.key.intensity).toBeGreaterThan(SHELL_KEY_INTENSITY);
  });

  it('fills violet-blue from the sky on the shade side and rims cool from the far side', () => {
    const lights = shellLights();
    thrusterCarLight(lights);
    const fill = lights.fill.position.clone().normalize();
    expect(fill.y).toBeGreaterThan(0.6);
    expect(fill.dot(lights.key.position.clone().normalize())).toBeLessThan(0);
    expect(lights.fill.color.b).toBeGreaterThan(lights.fill.color.g);
    expect(lights.fill.color.r).toBeGreaterThan(lights.fill.color.g * VIOLET_RED_SHARE);
    expect(lights.rim.color.b).toBeGreaterThan(lights.rim.color.r);
    expect(lights.fill.intensity).toBeLessThan(lights.rim.intensity);
    expect(lights.rim.intensity).toBeLessThan(lights.key.intensity);
    expect(
      lights.rim.position.clone().normalize().dot(lights.key.position.clone().normalize()),
    ).toBeLessThan(0);
  });

  it('places every light well beyond the site', () => {
    const lights = shellLights();
    thrusterCarLight(lights);
    Object.values(lights).forEach((light) => expect(light.position.length()).toBeCloseTo(400));
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = thrusterCarLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

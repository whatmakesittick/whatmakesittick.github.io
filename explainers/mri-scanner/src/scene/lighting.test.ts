import type { Color } from 'three';
import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { mriScannerLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

function coolness(colour: Color): number {
  return colour.b - colour.r;
}

describe('mri scanner light', () => {
  it('keys softly from above the bore mouth', () => {
    const lights = shellLights();
    mriScannerLight(lights);
    const key = lights.key.position.clone().normalize();
    expect(key.y).toBeGreaterThan(0.7);
    expect(key.z).toBeGreaterThan(0);
    expect(lights.key.intensity).toBeGreaterThan(lights.fill.intensity);
  });

  it('fills cool and rims from the control window side', () => {
    const lights = shellLights();
    mriScannerLight(lights);
    expect(coolness(lights.fill.color)).toBeGreaterThan(0);
    const rim = lights.rim.position.clone().normalize();
    expect(rim.x).toBeGreaterThan(0.8);
    expect(coolness(lights.rim.color)).toBeGreaterThan(0);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    mriScannerLight(lights)();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

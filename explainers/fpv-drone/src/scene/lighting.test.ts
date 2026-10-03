import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { fpvLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('fpv light', () => {
  it('keys cool and high from the left of the field', () => {
    const lights = shellLights();
    fpvLight(lights);
    const key = lights.key.position.clone().normalize();
    expect(key.z).toBeLessThan(0);
    expect(key.y).toBeGreaterThan(0.4);
    expect(lights.key.color.b).toBeGreaterThanOrEqual(lights.key.color.r);
  });

  it('fills softly and rims faintly from the far side', () => {
    const lights = shellLights();
    fpvLight(lights);
    expect(lights.fill.intensity).toBeLessThan(lights.key.intensity);
    expect(lights.rim.intensity).toBeLessThan(lights.fill.intensity);
    expect(
      lights.rim.position.clone().normalize().dot(lights.key.position.clone().normalize()),
    ).toBeLessThan(0);
  });

  it('puts the shell lights back as they were', () => {
    const lights = shellLights();
    lights.key.position.set(1, 2, 3);
    const restore = fpvLight(lights);
    restore();
    Object.values(lights).forEach((light) => {
      expect(light.intensity).toBe(1);
      expect(light.color.getHexString()).toBe('ffffff');
    });
    expect(lights.key.position.toArray()).toEqual([1, 2, 3]);
  });
});

import { DirectionalLight } from 'three';
import { describe, expect, it } from 'vitest';
import { ge9xLight } from './lighting';

function shellLights() {
  return {
    key: new DirectionalLight('#ffffff', 1),
    fill: new DirectionalLight('#ffffff', 1),
    rim: new DirectionalLight('#ffffff', 1),
  };
}

describe('GE9X light', () => {
  it('keys from the front above, on the camera side, and rims cool from behind the nozzles', () => {
    const lights = shellLights();
    ge9xLight(lights, 'dark');
    expect(lights.key.position.x).toBeLessThan(0);
    expect(lights.key.position.y).toBeGreaterThan(0);
    expect(lights.key.position.z).toBeGreaterThan(0);
    expect(lights.rim.position.x).toBeGreaterThan(0);
    expect(lights.rim.position.z).toBeLessThan(0);
    expect(lights.rim.color.b).toBeGreaterThan(lights.rim.color.r);
  });

  it('softens the rim on the light stage and restores the shell lights', () => {
    const dark = shellLights();
    const light = shellLights();
    ge9xLight(dark, 'dark');
    const restore = ge9xLight(light, 'light');
    expect(light.rim.intensity).toBeLessThan(dark.rim.intensity);
    restore();
    expect(light.rim.intensity).toBe(1);
  });
});

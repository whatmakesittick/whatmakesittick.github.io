import { describe, expect, it } from 'vitest';
import { bladeRow, helixBlade, impeller, inducer } from './rotor';

describe('rotor', () => {
  const inducerSpec = {
    top: 0,
    bottom: -5,
    hub: 2,
    tip: 6,
    blades: 3,
    twist: Math.PI,
    thickness: 0.4,
  };

  it('twists each inducer blade around the shaft', () => {
    const blade = helixBlade(inducerSpec, 0, 4);
    expect(blade.getAttribute('position').count).toBe(10);
    expect(inducer(inducerSpec, 8).getAttribute('position').count).toBeGreaterThan(0);
  });

  it('builds the impeller and the turbine wheel inside their tips', () => {
    const wheel = bladeRow({
      top: 0,
      bottom: -3,
      disc: 8,
      tip: 10,
      count: 20,
      pitch: 0.5,
      thickness: 0.4,
    });
    wheel.computeBoundingBox();
    expect(wheel.boundingBox?.max.x).toBeLessThan(10.5);
    const vanes = impeller({
      top: 0,
      bottom: -6,
      hub: 3,
      tip: 9,
      count: 8,
      sweep: 0.1,
      thickness: 0.4,
    });
    vanes.computeBoundingBox();
    expect(vanes.boundingBox?.max.x).toBeLessThan(9.5);
  });
});

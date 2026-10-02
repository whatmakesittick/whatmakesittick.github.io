import { describe, expect, it } from 'vitest';
import { LOITER, RUNWAY } from '../../model/layout';
import { MESAS } from '../constants';
import { mesaRings, outlineRadius } from './mesa';

const SITE = { x: 100, z: 200, radius: 50, height: 10, seed: 3 };

describe('mesas', () => {
  it('sinks the base below the ground and tops out at the given height', () => {
    const rings = mesaRings(SITE);
    expect(rings.length).toBe(MESAS.layers.length);
    expect(Math.min(...rings[0].map((point) => point[1]))).toBeLessThan(0);
    expect(Math.max(...rings[rings.length - 1].map((point) => point[1]))).toBeCloseTo(SITE.height);
  });

  it('keeps an irregular outline around its centre', () => {
    const radii = Array.from({ length: 24 }, (_, index) => outlineRadius(SITE, index / 4));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(SITE.radius * 0.1);
    radii.forEach((radius) => expect(radius).toBeGreaterThan(SITE.radius / 2));
  });

  it('stays clear of the runway and the loiter circle', () => {
    for (const site of MESAS.sites) {
      const reach = site.radius * MESAS.layers[0].spread * (1 + MESAS.roughness / 2);
      const toLoiter = Math.hypot(site.x - LOITER.centre[0], site.z - LOITER.centre[1]);
      expect(toLoiter - reach).toBeGreaterThan(LOITER.radius + 40);
      const toRunway = Math.hypot(site.x - (RUNWAY.x[0] + RUNWAY.x[1]) / 2, site.z - RUNWAY.z);
      expect(toRunway - reach).toBeGreaterThan(150);
    }
  });
});

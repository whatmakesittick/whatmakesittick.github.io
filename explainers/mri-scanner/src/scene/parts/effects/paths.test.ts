import { describe, expect, it } from 'vitest';
import { FIELD_DIRECTION, ISOCENTRE, MAGNET } from '../../../model/layout';
import { FIELD_LINES } from './looks';
import {
  ellipseRibbon,
  fieldLoop,
  fieldLoopSpecs,
  loopAzimuths,
  placeLoop,
  ringWaves,
} from './paths';
import { easeToward } from './pulses';

const INSIDE_POINTS = FIELD_LINES.straightSamples;

describe('field loops', () => {
  const specs = fieldLoopSpecs();

  it('nests the loops so that none of them cross', () => {
    expect(specs).toHaveLength(FIELD_LINES.innerRadii.length);
    specs.slice(1).forEach((spec, index) => {
      expect(spec.inner).toBeLessThan(specs[index].inner);
      expect(spec.outer).toBeGreaterThan(specs[index].outer);
      expect(spec.bulge).toBeGreaterThan(specs[index].bulge);
    });
  });

  it('fans out past both ends of the magnet and closes on itself', () => {
    specs.forEach((spec) => {
      const alongs = fieldLoop(spec).map(([, along]) => along);
      expect(Math.max(...alongs)).toBeGreaterThan(MAGNET.halfLength);
      expect(Math.min(...alongs)).toBeLessThan(-MAGNET.halfLength);
      expect(Math.max(...alongs) + Math.min(...alongs)).toBeCloseTo(0);
    });
  });

  it('runs straight through the bore and returns outside the magnet', () => {
    specs.forEach((spec) => {
      const points = fieldLoop(spec);
      const inside = points.slice(0, INSIDE_POINTS);
      inside.forEach(([radial]) => expect(radial).toBe(spec.inner));
      const outermost = Math.max(...points.map(([radial]) => radial));
      expect(outermost).toBeGreaterThan(MAGNET.radius);
    });
  });

  it('travels along the main field inside the bore', () => {
    const placed = placeLoop(fieldLoop(specs[0]), 0, ISOCENTRE);
    const first = placed[0];
    const last = placed[INSIDE_POINTS];
    const travel = [0, 1, 2].map((axis) => last[axis] - first[axis]);
    const dot = travel.reduce((sum, value, axis) => sum + value * FIELD_DIRECTION[axis], 0);
    expect(dot).toBeCloseTo(2 * specs[0].halfLength);
  });

  it('places two half loops in each plane through the axis', () => {
    const azimuths = loopAzimuths(FIELD_LINES.planes);
    expect(azimuths).toHaveLength(2 * FIELD_LINES.planes);
    expect(azimuths[FIELD_LINES.planes] - azimuths[0]).toBeCloseTo(Math.PI);
  });
});

describe('fringe ribbon', () => {
  it('straddles the ellipse with a constant width', () => {
    const side = 2;
    const along = 3;
    const halfWidth = 0.01;
    const points = ellipseRibbon(side, along, 16, halfWidth);
    expect(points).toHaveLength(34);
    for (let index = 0; index < points.length; index += 2) {
      const [ix, iz] = points[index];
      const [ox, oz] = points[index + 1];
      const mid = [(ix + ox) / 2, (iz + oz) / 2];
      expect((mid[0] / side) ** 2 + (mid[1] / along) ** 2).toBeCloseTo(1);
      expect(Math.hypot(ox - ix, oz - iz)).toBeCloseTo(2 * halfWidth);
    }
  });
});

describe('ring timing', () => {
  it('stays within bounds, staggers the rings and loops over time', () => {
    const waves = ringWaves(0.4, 3);
    waves.forEach(({ travel, strength }) => {
      expect(travel).toBeGreaterThanOrEqual(0);
      expect(travel).toBeLessThan(1);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1);
    });
    expect(new Set(waves.map(({ travel }) => travel.toFixed(3))).size).toBe(3);
    expect(ringWaves(1.4, 3)[0].travel).toBeCloseTo(waves[0].travel);
  });
});

describe('glow easing', () => {
  it('eases toward the target', () => {
    expect(easeToward(0, 1, 6, 0)).toBe(0);
    expect(easeToward(0, 1, 6, 0.1)).toBeGreaterThan(0);
    expect(easeToward(0, 1, 6, 10)).toBeCloseTo(1);
  });
});

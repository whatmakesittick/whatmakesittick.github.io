import { describe, expect, it } from 'vitest';
import type { RegionSpec } from '@core/scene/regions';
import type { Point } from '../../../ids';
import {
  BACK_CHECK,
  DAMPER,
  KEY,
  PLAYED_KEY,
  jackAnchor,
  keyX,
  regionSpecFor,
  stringPath,
} from '../../../model';
import type { RegionOptions } from '../../../model';
import { closeUpRegion, isCloseUpRegion } from './closeUp';

const PLAIN: RegionOptions = { ghost: false, inset: false };
const KEYS = Object.values(PLAYED_KEY);

function holds({ x, y, z }: RegionSpec, [px, py, pz]: Point): boolean {
  return px >= x[0] && px <= x[1] && py >= y[0] && py <= y[1] && pz >= z[0] && pz <= z[1];
}

function speakingMiddle(key: number): Point {
  const { front, back } = stringPath(key);
  return [(front[0] + back[0]) / 2, front[1], (front[2] + back[2]) / 2];
}

describe('close-up regions', () => {
  it('overrides only the action and escapement regions', () => {
    expect(isCloseUpRegion('action')).toBe(true);
    expect(isCloseUpRegion('escapement')).toBe(true);
    expect(isCloseUpRegion('lineUp')).toBe(false);
    expect(isCloseUpRegion('string')).toBe(false);
  });

  it('frames the played key from its front to its damper, leaving out the far string', () => {
    KEYS.forEach((key) => {
      const region = closeUpRegion('action', key, PLAIN);
      expect(holds(region, [keyX(key), KEY.top, KEY.frontZ])).toBe(true);
      expect(holds(region, stringPath(key).strike)).toBe(true);
      expect(holds(region, [keyX(key), stringPath(key).strike[1], DAMPER.z])).toBe(true);
    });
    [PLAYED_KEY.bass, PLAYED_KEY.middle].forEach((key) => {
      expect(holds(closeUpRegion('action', key, PLAIN), speakingMiddle(key))).toBe(false);
    });
  });

  it('still grows the action region for the upright ghost', () => {
    const key = PLAYED_KEY.middle;
    const ghost = regionSpecFor('action', key, { ghost: true, inset: false });
    const region = closeUpRegion('action', key, { ghost: true, inset: false });
    expect(region.y[1]).toBeGreaterThanOrEqual(ghost.y[1]);
    expect(region.z[1]).toBeGreaterThanOrEqual(ghost.z[1]);
  });

  it('frames the escapement from the back check to the jack, with the hammer at its string', () => {
    KEYS.forEach((key) => {
      const region = closeUpRegion('escapement', key, PLAIN);
      expect(holds(region, jackAnchor(key))).toBe(true);
      expect(holds(region, [keyX(key), BACK_CHECK.y, BACK_CHECK.z])).toBe(true);
      expect(holds(region, stringPath(key).strike)).toBe(true);
    });
  });

  it('gives the escapement a little headroom while the inset shows', () => {
    KEYS.forEach((key) => {
      const plain = closeUpRegion('escapement', key, PLAIN);
      const inset = closeUpRegion('escapement', key, { ghost: false, inset: true });
      expect(inset.y[1]).toBeGreaterThan(plain.y[1]);
      expect([inset.x, inset.y[0], inset.z]).toEqual([plain.x, plain.y[0], plain.z]);
    });
  });
});

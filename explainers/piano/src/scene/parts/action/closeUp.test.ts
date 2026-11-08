import { describe, expect, it } from 'vitest';
import type { RegionSpec } from '@core/scene/regions';
import type { Point } from '../../../ids';
import { INSET, KEY, PLAYED_KEY, keyX, regionSpecFor, stringPath } from '../../../model';
import type { RegionOptions } from '../../../model';
import { labelPoint, panelCentre } from '../inset/window';
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

  it('frames the played key from its front to the strings label of its note', () => {
    KEYS.forEach((key) => {
      const region = closeUpRegion('action', key, PLAIN);
      expect(holds(region, [keyX(key), KEY.top, KEY.frontZ])).toBe(true);
      expect(holds(region, speakingMiddle(key))).toBe(true);
    });
  });

  it('still grows the action region for the upright ghost', () => {
    const key = PLAYED_KEY.middle;
    const ghost = regionSpecFor('action', key, { ghost: true, inset: false });
    const region = closeUpRegion('action', key, { ghost: true, inset: false });
    expect(region.y[1]).toBeGreaterThanOrEqual(ghost.y[1]);
    expect(region.z[1]).toBeGreaterThanOrEqual(ghost.z[1]);
  });

  it('adds the inset panel and its label to the escapement only while the inset shows', () => {
    KEYS.forEach((key) => {
      const centre = panelCentre(key);
      const corner: Point = [centre[0], centre[1] + INSET.height / 2, centre[2] - INSET.width / 2];
      const plain = closeUpRegion('escapement', key, PLAIN);
      const inset = closeUpRegion('escapement', key, { ghost: false, inset: true });
      const model = regionSpecFor('escapement', key, PLAIN);
      expect([plain.y, plain.z]).toEqual([model.y, model.z]);
      expect(holds(plain, [keyX(key), model.y[0], model.z[0]])).toBe(true);
      expect(holds(inset, corner)).toBe(true);
      expect(holds(inset, labelPoint(centre))).toBe(true);
    });
  });
});

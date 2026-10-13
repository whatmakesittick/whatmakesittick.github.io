import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import { REGION_BOUNDS } from './layout';
import { STARTER_GEOMETRY } from './scale';
import { PULL_ROPE_SHARE } from './start';

describe('layout', () => {
  it('keeps the grip in the starter region at its furthest pull', () => {
    const { gripRest, ropeDirection, ropeDrawM } = STARTER_GEOMETRY;
    const reach = PULL_ROPE_SHARE * ropeDrawM;
    const { min, max } = REGION_BOUNDS.starter;
    [0, 1, 2].forEach((axis) => {
      const end = gripRest[axis] + ropeDirection[axis] * reach;
      expect(end).toBeGreaterThanOrEqual(min[axis]);
      expect(end).toBeLessThanOrEqual(max[axis]);
    });
  });

  it('has a region for every id', () => {
    expect(Object.keys(REGION_BOUNDS).sort()).toEqual([...REGION_IDS].sort());
  });
});

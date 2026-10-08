import { describe, expect, it } from 'vitest';
import { SPACING_OPTIONS } from '../../../ids';
import { TURBINE_LAND, farmLayout, terrainHeight } from '../../../model/layout';
import { FARM_TREE_LIMITS, TURBINE_TREE_LIMITS } from './constants';
import { farmKeepOut } from './farmKeepOut';
import { farmFieldLayout, farmTreeArea } from './farmLand';
import { placeTrees } from './treePlacement';
import { turbineLandHeight } from './turbineGround';
import { turbineFieldLayout, turbineTreeArea } from './turbineLand';

describe('turbine land', () => {
  it('is flat around the tower and meets the terrain past the blend', () => {
    expect(turbineLandHeight(TURBINE_LAND.flatRadius, 0)).toBe(0);
    const far = TURBINE_LAND.blendRadius + 1;
    expect(turbineLandHeight(0, far)).toBeCloseTo(terrainHeight(0, far));
  });

  it('keeps trees away from the hero', () => {
    const spots = placeTrees(turbineTreeArea(turbineFieldLayout()));
    expect(spots.length).toBeGreaterThan(300);
    spots.forEach(({ x, z }) =>
      expect(Math.hypot(x, z)).toBeGreaterThan(TURBINE_TREE_LIMITS.heroClear),
    );
  });
});

describe('farm land', () => {
  it('keeps tree clumps clear of every turbine site', () => {
    const keepOut = farmKeepOut();
    const spots = placeTrees(farmTreeArea(farmFieldLayout(keepOut), keepOut));
    expect(spots.length).toBeGreaterThan(1000);
    const sites = SPACING_OPTIONS.flatMap((spacing) => farmLayout(spacing));
    spots.forEach(({ x, z }) =>
      sites.forEach((site) =>
        expect(Math.hypot(x - site.x, z - site.z)).toBeGreaterThan(FARM_TREE_LIMITS.siteClear),
      ),
    );
  });
});

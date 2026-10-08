import { describe, expect, it } from 'vitest';
import { TURBINE_LAND, terrainHeight } from '../../../model/layout';
import { turbineLandHeight } from './turbineGround';

describe('turbine land', () => {
  it('is flat around the tower and meets the terrain past the blend', () => {
    expect(turbineLandHeight(TURBINE_LAND.flatRadius, 0)).toBe(0);
    const far = TURBINE_LAND.blendRadius + 1;
    expect(turbineLandHeight(0, far)).toBeCloseTo(terrainHeight(0, far));
  });
});

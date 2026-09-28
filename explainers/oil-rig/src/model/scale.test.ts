import { describe, expect, it } from 'vitest';
import {
  DRILL_FLOOR_Y,
  ROCK_COMPRESSION,
  SEABED_Y,
  SEA_LEVEL_Y,
  WATER_COMPRESSION,
  depthToY,
  tubularRadius,
  unitsPerMetreAt,
  yToDepth,
} from './scale';
import { DRILL_FLOOR_ABOVE_SEA_M, SEABED_DEPTH_M, TOTAL_DEPTH_M, WATER_DEPTH_M } from './wellPlan';

describe('depthToY', () => {
  it('places the drill floor above the sea at true scale', () => {
    expect(depthToY(0)).toBe(DRILL_FLOOR_Y);
    expect(depthToY(DRILL_FLOOR_ABOVE_SEA_M)).toBe(SEA_LEVEL_Y);
    expect(depthToY(DRILL_FLOOR_ABOVE_SEA_M / 2)).toBe(DRILL_FLOOR_Y / 2);
  });

  it('compresses the water column', () => {
    expect(depthToY(SEABED_DEPTH_M)).toBeCloseTo(-WATER_DEPTH_M / WATER_COMPRESSION);
    expect(SEABED_Y).toBeCloseTo(-WATER_DEPTH_M / WATER_COMPRESSION);
  });

  it('compresses the rock more than the water', () => {
    const below = TOTAL_DEPTH_M - SEABED_DEPTH_M;
    expect(depthToY(TOTAL_DEPTH_M)).toBeCloseTo(SEABED_Y - below / ROCK_COMPRESSION);
    expect(unitsPerMetreAt(TOTAL_DEPTH_M)).toBeLessThan(unitsPerMetreAt(SEABED_DEPTH_M - 1));
  });

  it('is monotonic and invertible', () => {
    let previous = depthToY(0);
    for (let depth = 10; depth <= TOTAL_DEPTH_M; depth += 10) {
      const y = depthToY(depth);
      expect(y).toBeLessThan(previous);
      expect(yToDepth(y)).toBeCloseTo(depth, 6);
      previous = y;
    }
  });
});

describe('tubularRadius', () => {
  it('scales a pipe diameter given in inches', () => {
    expect(tubularRadius(20)).toBeCloseTo((20 * 0.0254 * 8) / 2);
  });
});

import { describe, expect, it } from 'vitest';
import { MODULE } from '../../model';
import { FRAME_WALL_CM } from './moduleLayout';
import { shadePolygon } from './shade';

describe('shade band', () => {
  it('draws a band inside the laminate whose top edge falls to the east', () => {
    expect(shadePolygon(0)).toHaveLength(0);
    const band = shadePolygon(0.4);
    band.forEach((point) => {
      expect(point.y).toBeGreaterThanOrEqual(FRAME_WALL_CM - 1e-9);
      expect(point.y).toBeLessThanOrEqual(MODULE.height - FRAME_WALL_CM + 1e-9);
    });
    const [, , right, left] = band;
    expect(left.y).toBeGreaterThan(right.y);
    const full = shadePolygon(1);
    expect(Math.max(...full.map((point) => point.y))).toBeCloseTo(MODULE.height - FRAME_WALL_CM, 6);
  });
});

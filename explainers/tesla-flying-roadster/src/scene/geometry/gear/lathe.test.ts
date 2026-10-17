import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { FULL_TURN } from '@core/math';
import { arcShares, latheAround } from './lathe';
import type { Profile } from './lathe';

const RING: Profile = [
  [1, -1],
  [1, 0],
  [1, 2],
];

describe('lathe', () => {
  it('measures the profile by arc length', () => {
    expect(arcShares(RING)).toEqual([0, 1 / 3, 1]);
  });

  it('turns the profile around the asked axis', () => {
    const alongX = new Box3().setFromBufferAttribute(
      latheAround(RING, { axis: 'x', segments: 8 }).getAttribute('position') as never,
    );
    const alongZ = new Box3().setFromBufferAttribute(
      latheAround(RING, { axis: 'z', segments: 8 }).getAttribute('position') as never,
    );
    expect([alongX.min.x, alongX.max.x]).toEqual([-1, 2]);
    expect(alongZ.min.z).toBeCloseTo(-1);
    expect(alongZ.max.z).toBeCloseTo(2);
  });

  it('keeps the texture around the full turn on a partial sweep', () => {
    const sweep = { start: FULL_TURN / 4, length: FULL_TURN / 2 };
    const uv = latheAround(RING, { axis: 'y', segments: 4, sweep }).getAttribute('uv');
    const us = Array.from({ length: uv.count }, (_, index) => uv.getX(index));
    expect(Math.min(...us)).toBeCloseTo(1 / 4);
    expect(Math.max(...us)).toBeCloseTo(3 / 4);
  });

  it('lathes a span with the full profile texture coordinates', () => {
    const uv = latheAround(RING, { axis: 'y', segments: 4, span: [1, 2] }).getAttribute('uv');
    const vs = Array.from({ length: uv.count }, (_, index) => uv.getY(index));
    expect(Math.min(...vs)).toBeCloseTo(1 / 3);
    expect(Math.max(...vs)).toBeCloseTo(1);
  });
});

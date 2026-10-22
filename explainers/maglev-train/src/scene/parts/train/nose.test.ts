import { describe, expect, it } from 'vitest';
import { BODY, NOSE, NOSE_REACH } from './constants';
import { edgeInset, nosePoint, noseWidth, superEllipse, surfacePoint } from './nose';
import type { SectionEnds } from './nose';
import { CONTOUR } from './profile';

const ENDS: SectionEnds = { rearX: 0, frontX: 20, rear: 'joint', front: 'nose' };

describe('nose shape', () => {
  it('bounds the superellipse between zero and one', () => {
    expect(superEllipse(-1, 2)).toBe(0);
    expect(superEllipse(0.5, 2)).toBeCloseTo(Math.sqrt(0.75));
    expect(superEllipse(2, 2)).toBe(1);
  });

  it('closes every row onto the centreline at the tip', () => {
    CONTOUR.rows.forEach((row) => {
      const [z, y] = nosePoint(row, 0);
      expect(z).toBeCloseTo(0);
      expect(y).toBeGreaterThanOrEqual(NOSE.tipBottom - 1e-9);
      expect(y).toBeLessThanOrEqual(NOSE.tipTop + 1e-9);
    });
  });

  it('tapers the top for longer than the bottom', () => {
    const distance = 2;
    expect(noseWidth(distance, 1)).toBeLessThan(noseWidth(distance, 0));
  });

  it('meets the full body section where the nose begins', () => {
    CONTOUR.rows.forEach((row) => {
      const [x, y, z] = surfacePoint(row, ENDS.frontX - NOSE_REACH, ENDS);
      expect(x).toBeCloseTo(ENDS.frontX - NOSE_REACH);
      expect(y).toBeCloseTo(row.y, 3);
      expect(z).toBeCloseTo(row.z, 3);
    });
  });

  it('rounds the joint ends inward and leaves the middle alone', () => {
    expect(edgeInset(0)).toBeGreaterThan(0);
    expect(edgeInset(1)).toBe(0);
    const [, , z] = surfacePoint(CONTOUR.rows[CONTOUR.firstRow.band], ENDS.rearX, ENDS);
    expect(z).toBeLessThan(BODY.halfWidth);
  });
});

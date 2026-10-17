import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { BODY, WHEEL } from './dimensions';
import { carSilhouette } from './silhouette';

const TRIANGLES = { min: 1500, max: 2500 } as const;
const TOLERANCE = 1e-6;

describe('carSilhouette', () => {
  const outline = carSilhouette();

  it('stays a light ghost shape', () => {
    const index = outline.getIndex();
    const triangles = (index ? index.count : outline.getAttribute('position').count) / 3;
    expect(triangles).toBeGreaterThanOrEqual(TRIANGLES.min);
    expect(triangles).toBeLessThanOrEqual(TRIANGLES.max);
  });

  it('fills the car outline from the tyres to the roof', () => {
    const bounds = new Box3().setFromBufferAttribute(outline.getAttribute('position') as never);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeCloseTo(2 * BODY.halfLength, 6);
    expect(bounds.max.z).toBeLessThanOrEqual(BODY.halfWidth + TOLERANCE);
    expect(bounds.max.y).toBeCloseTo(BODY.roofY, 2);
    expect(bounds.min.y).toBeCloseTo(WHEEL.centreY - WHEEL.radius, 6);
  });
});

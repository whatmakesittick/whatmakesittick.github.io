import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { BLADE, bladeChord, bladeGeometry, bladeTwist } from './blade';

function sectionNear(radius: number): Vector3[] {
  const position = bladeGeometry().getAttribute('position');
  const points = Array.from({ length: position.count }, (_, index) =>
    new Vector3().fromBufferAttribute(position, index),
  );
  const closest = points.reduce((best, point) =>
    Math.abs(point.y - radius) < Math.abs(best.y - radius) ? point : best,
  );
  return points.filter((point) => Math.abs(point.y - closest.y) < 1e-4);
}

describe('bladeGeometry', () => {
  it('spans from the root to the tip radius', () => {
    const geometry = bladeGeometry();
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.y).toBeCloseTo(BLADE.rootRadius, 3);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(BLADE.tipRadius, 3);
  });

  it('peaks at the maximum chord near a fifth of the span', () => {
    expect(bladeChord(BLADE.maxChordShare)).toBeCloseTo(BLADE.maxChord, 5);
    expect(bladeChord(0.5)).toBeLessThan(BLADE.maxChord);
    expect(bladeChord(1)).toBeLessThan(0.2);
  });

  it('twists from the root value to zero at the tip', () => {
    expect(bladeTwist(0.1)).toBeCloseTo((BLADE.rootTwistDeg * Math.PI) / 180, 5);
    expect(bladeTwist(1)).toBeCloseTo(0, 5);
  });

  it('turns the leading edge into the wind with twist at pitch zero', () => {
    const section = sectionNear(20);
    const leading = section.reduce((best, point) => (point.z > best.z ? point : best));
    const trailing = section.reduce((best, point) => (point.z < best.z ? point : best));
    expect(leading.z).toBeGreaterThan(0);
    expect(leading.x).toBeLessThan(trailing.x);
  });

  it('faces its surface outward', () => {
    const geometry = bladeGeometry();
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const outward = Array.from({ length: BLADE.aroundSections }, (_, step) => {
      const index = 20 * BLADE.aroundSections + step;
      const point = new Vector3().fromBufferAttribute(position, index).setY(0);
      return new Vector3().fromBufferAttribute(normal, index).setY(0).dot(point) > 0;
    });
    expect(outward.filter(Boolean).length).toBeGreaterThan(BLADE.aroundSections * 0.8);
  });
});

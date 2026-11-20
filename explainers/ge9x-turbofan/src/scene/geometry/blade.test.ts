import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { bladeGeometry, mirroredZ } from './blade';
import type { BladeSpec } from './blade';

const SPEC: BladeSpec = {
  hub: 0.5,
  tip: 1,
  stations: 4,
  samples: 5,
  chord: () => 0.2,
  stagger: () => 0.6,
  camber: () => 0.05,
  thickness: () => 0.08,
};

function volume(spec: BladeSpec, mirror = false): number {
  const geometry = bladeGeometry(spec);
  if (mirror) mirroredZ(geometry);
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) throw new Error('Blade is not indexed');
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  let total = 0;
  for (let entry = 0; entry < index.count; entry += 3) {
    a.fromBufferAttribute(position, index.getX(entry));
    b.fromBufferAttribute(position, index.getX(entry + 1));
    c.fromBufferAttribute(position, index.getX(entry + 2));
    total += a.dot(b.cross(c));
  }
  return total;
}

describe('blade geometry', () => {
  it('builds a closed blade that faces outward, mirrored or not', () => {
    expect(volume(SPEC)).toBeGreaterThan(0);
    expect(volume(SPEC, true)).toBeGreaterThan(0);
  });

  it('spans from the hub to the tip radius', () => {
    const geometry = bladeGeometry(SPEC);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    expect(box?.max.y).toBeCloseTo(SPEC.tip, 2);
    expect(box?.min.y).toBeGreaterThan(SPEC.hub * 0.95);
  });

  it('puts the leading edge forward and toward the turn at a positive stagger', () => {
    const geometry = bladeGeometry({ ...SPEC, camber: () => 0 });
    const position = geometry.getAttribute('position');
    const leading = new Vector3().fromBufferAttribute(position, 0);
    expect(leading.x).toBeLessThan(0);
    expect(leading.z).toBeGreaterThan(0);
  });
});

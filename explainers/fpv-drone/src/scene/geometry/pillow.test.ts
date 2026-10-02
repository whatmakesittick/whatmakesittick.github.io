import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { pillowGeometry } from './pillow';

const SHAPE = {
  size: [0.56, 0.13, 0.34] as const,
  squareness: 2.4,
  widthSegments: 12,
  heightSegments: 6,
};

function topShare(squareness: number): number {
  const geometry = pillowGeometry({ ...SHAPE, squareness });
  const position = geometry.getAttribute('position');
  let flat = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (position.getY(index) > (SHAPE.size[1] / 2) * 0.9) flat += 1;
  }
  return flat / position.count;
}

describe('pillow', () => {
  it('fills its size exactly', () => {
    const geometry = pillowGeometry(SHAPE);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();
    expect(box.max.x - box.min.x).toBeCloseTo(SHAPE.size[0]);
    expect(box.max.y - box.min.y).toBeCloseTo(SHAPE.size[1]);
    expect(box.max.z - box.min.z).toBeCloseTo(SHAPE.size[2]);
  });

  it('flattens the top more as the squareness grows', () => {
    expect(topShare(2.4)).toBeGreaterThan(topShare(1));
  });
});

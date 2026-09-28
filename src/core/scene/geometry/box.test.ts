import { describe, expect, it } from 'vitest';
import { box } from './box';

describe('box', () => {
  it('fills the bounds it is given', () => {
    const geometry = box({ minX: -1, maxX: 3, minY: 2, maxY: 4, minZ: -5, maxZ: -1 });
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.toArray()).toEqual([-1, 2, -5]);
    expect(geometry.boundingBox?.max.toArray()).toEqual([3, 4, -1]);
  });
});

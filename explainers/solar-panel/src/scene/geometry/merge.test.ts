import { BoxGeometry, ExtrudeGeometry, Shape } from 'three';
import { describe, expect, it } from 'vitest';
import { mergeParts } from './merge';

describe('mergeParts', () => {
  it('merges indexed and flat geometries into one flat geometry with shared attributes', () => {
    const square = new Shape();
    square.moveTo(0, 0);
    square.lineTo(1, 0);
    square.lineTo(1, 1);
    square.lineTo(0, 1);
    const merged = mergeParts([
      new BoxGeometry(1, 1, 1),
      new ExtrudeGeometry(square, { depth: 1, bevelEnabled: false }),
    ]);
    expect(merged.index).toBeNull();
    expect(Object.keys(merged.attributes).sort()).toEqual(['normal', 'position', 'uv']);
    expect(merged.getAttribute('position').count).toBeGreaterThan(36);
  });
});

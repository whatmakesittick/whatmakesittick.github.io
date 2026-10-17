import { describe, expect, it } from 'vitest';
import { BoxGeometry, Color } from 'three';
import { pinnedUv, tinted } from './attributes';

describe('gear attributes', () => {
  it('paints every vertex with one colour', () => {
    const geometry = tinted(new BoxGeometry(), '#ff8000');
    const colour = geometry.getAttribute('color');
    const expected = new Color('#ff8000');
    expect(colour.count).toBe(geometry.getAttribute('position').count);
    expect(colour.getX(colour.count - 1)).toBeCloseTo(expected.r);
    expect(colour.getY(0)).toBeCloseTo(expected.g);
  });

  it('pins every texture coordinate to one texel', () => {
    const uv = pinnedUv(new BoxGeometry(), 0.1, 0.9).getAttribute('uv');
    const all = Array.from({ length: uv.count }, (_, index) => [uv.getX(index), uv.getY(index)]);
    all.forEach(([u, v]) => {
      expect(u).toBeCloseTo(0.1);
      expect(v).toBeCloseTo(0.9);
    });
  });
});

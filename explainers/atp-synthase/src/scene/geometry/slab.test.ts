import { describe, expect, it } from 'vitest';
import { SLAB_SURFACES, slabGeometry } from './slab';

const FORM = { x: [-10, 4], y: [-2, 2], z: [-30, 6], faceTile: 2 } as const;

function uvsOfGroup(index: number): { u: number[]; v: number[] } {
  const geometry = slabGeometry(FORM);
  const group = geometry.groups[index];
  const uv = geometry.getAttribute('uv');
  const indices = geometry.index;
  if (!indices) throw new Error('The slab is indexed');
  const u: number[] = [];
  const v: number[] = [];
  for (let item = group.start; item < group.start + group.count; item += 1) {
    u.push(uv.getX(indices.getX(item)));
    v.push(uv.getY(indices.getX(item)));
  }
  return { u, v };
}

describe('slab geometry', () => {
  it('tiles the top face in nanometres', () => {
    const top = uvsOfGroup(SLAB_SURFACES.indexOf('face'));
    expect(Math.min(...top.u)).toBeCloseTo(FORM.x[0] / FORM.faceTile);
    expect(Math.max(...top.u)).toBeCloseTo(FORM.x[1] / FORM.faceTile);
    expect(Math.max(...top.v) - Math.min(...top.v)).toBeCloseTo(18);
  });

  it('stretches the edge texture once across the thickness', () => {
    [0, 1, 4, 5].forEach((group) => {
      const { v } = uvsOfGroup(group);
      expect(Math.min(...v)).toBeCloseTo(0);
      expect(Math.max(...v)).toBeCloseTo(1);
    });
  });

  it('keeps the edge texels square', () => {
    const front = uvsOfGroup(4);
    expect(Math.max(...front.u) - Math.min(...front.u)).toBeCloseTo(14 / 4);
  });
});

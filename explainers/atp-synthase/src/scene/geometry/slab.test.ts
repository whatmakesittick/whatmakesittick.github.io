import { describe, expect, it } from 'vitest';
import { SLAB_SURFACES, slabGeometry } from './slab';

const FORM = { x: [-10, 4], y: [-2, 2], z: [-30, 6], faceTile: 2 } as const;

function uvsOfSurface(surface: 'edge' | 'face'): { u: number[]; v: number[] } {
  const geometry = slabGeometry(FORM);
  const group = geometry.groups[SLAB_SURFACES.indexOf(surface)];
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
    const faces = uvsOfSurface('face');
    expect(Math.min(...faces.u)).toBeCloseTo(FORM.x[0] / FORM.faceTile);
    expect(Math.max(...faces.u)).toBeCloseTo(FORM.x[1] / FORM.faceTile);
    expect(Math.max(...faces.v) - Math.min(...faces.v)).toBeCloseTo(18);
  });

  it('stretches the edge texture once across the thickness', () => {
    const { v } = uvsOfSurface('edge');
    expect(Math.min(...v)).toBeCloseTo(0);
    expect(Math.max(...v)).toBeCloseTo(1);
  });

  it('keeps the edge texels square', () => {
    const edges = uvsOfSurface('edge');
    expect(Math.max(...edges.u) - Math.min(...edges.u)).toBeCloseTo(36 / 4);
  });

  it('draws the slab in two groups, edges and faces', () => {
    const geometry = slabGeometry(FORM);
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    expect(geometry.groups.reduce((sum, group) => sum + group.count, 0)).toBe(36);
  });
});

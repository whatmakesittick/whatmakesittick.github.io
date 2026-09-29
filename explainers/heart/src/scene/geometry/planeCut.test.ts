import type { BufferGeometry } from 'three';
import { BufferAttribute, IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { FRONTAL_PLANE, insertPlane, planeLoops, sideFilter, subsetGeometry } from './planeCut';

function ball(): BufferGeometry {
  const raw = new IcosahedronGeometry(10, 2);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  raw.translate(0.37, 0.21, 0.13);
  return mergeVertices(raw);
}

function crossesPlane(geometry: BufferGeometry): boolean {
  const positions = geometry.getAttribute('position').array;
  const index = geometry.getIndex()?.array ?? [];
  for (let t = 0; t < index.length; t += 3) {
    const sides = [0, 1, 2].map((corner) => Math.sign(positions[index[t + corner] * 3 + 2]));
    if (sides.includes(1) && sides.includes(-1)) return true;
  }
  return false;
}

describe('plane cuts', () => {
  it('splits every triangle that crosses the plane', () => {
    const cut = insertPlane(ball(), FRONTAL_PLANE);
    expect(crossesPlane(cut)).toBe(false);
  });

  it('interpolates every attribute at the new vertices', () => {
    const geometry = ball();
    const count = geometry.getAttribute('position').count;
    const heat = new Float32Array(count);
    const positions = geometry.getAttribute('position').array;
    for (let vertex = 0; vertex < count; vertex += 1) heat[vertex] = positions[vertex * 3 + 2];
    geometry.setAttribute('heat', new BufferAttribute(heat, 1));
    const cut = insertPlane(geometry, FRONTAL_PLANE);
    const cutPositions = cut.getAttribute('position').array;
    const cutHeat = cut.getAttribute('heat').array;
    for (let vertex = 0; vertex < cut.getAttribute('position').count; vertex += 1) {
      expect(cutHeat[vertex]).toBeCloseTo(cutPositions[vertex * 3 + 2], 4);
    }
  });

  it('keeps one side with every attribute and morph target', () => {
    const cut = insertPlane(ball(), FRONTAL_PLANE);
    const count = cut.getAttribute('position').count;
    cut.morphAttributes.position = [new BufferAttribute(new Float32Array(count * 3).fill(1), 3)];
    const back = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
    const positions = back.getAttribute('position').array;
    for (let offset = 2; offset < positions.length; offset += 3)
      expect(positions[offset]).toBeLessThanOrEqual(1e-3);
    expect(back.morphAttributes.position?.[0].count).toBe(back.getAttribute('position').count);
  });

  it('finds the closed outline where a closed surface meets the plane', () => {
    const cut = insertPlane(ball(), FRONTAL_PLANE);
    const back = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
    const loops = planeLoops(back, FRONTAL_PLANE);
    expect(loops).toHaveLength(1);
    const positions = back.getAttribute('position').array;
    for (const vertex of loops[0]) expect(Math.abs(positions[vertex * 3 + 2])).toBeLessThan(1e-2);
    expect(loops[0].length).toBeGreaterThan(10);
  });
});

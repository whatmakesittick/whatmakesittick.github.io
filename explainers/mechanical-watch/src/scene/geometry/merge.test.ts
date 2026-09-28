import { describe, expect, it } from 'vitest';
import { BoxGeometry, CylinderGeometry } from 'three';
import { merge, mergeGrouped } from './merge';

describe('merge', () => {
  it('keeps material groups in index order', () => {
    const merged = mergeGrouped([
      { geometry: new BoxGeometry(1, 1, 1), material: 1 },
      { geometry: new BoxGeometry(1, 1, 1), material: 0 },
    ]);
    expect(merged.groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    expect(merged.groups[0].count).toBe(36);
    expect(merged.getAttribute('position').count).toBe(72);
  });

  it('puts a whole part into its given material despite inner groups', () => {
    const merged = mergeGrouped([{ geometry: new CylinderGeometry(1, 1, 1, 8), material: 1 }]);
    expect(merged.groups).toHaveLength(1);
    expect(merged.groups[0].materialIndex).toBe(1);
  });

  it('flattens plain merges into one group-free geometry', () => {
    const merged = merge([new BoxGeometry(1, 1, 1), new CylinderGeometry(1, 1, 1, 8)]);
    expect(merged.groups).toHaveLength(0);
    expect(merged.index).toBeNull();
  });
});

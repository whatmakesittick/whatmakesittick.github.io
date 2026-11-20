import { Group, Mesh, Vector3 } from 'three';
import type { Intersection } from 'three';
import { describe, expect, it } from 'vitest';
import { FORCE_ARROWS_NAME } from './parts/forces';
import { HAND_PATH_NAME } from './parts/handPath';
import { blocksLabels } from './sceneOptions';

const FAR_M = 10;

function hitInside(groupName: string): Intersection {
  const group = new Group();
  group.name = groupName;
  const inner = new Group();
  const mesh = new Mesh();
  inner.add(mesh);
  group.add(inner);
  return { object: mesh, distance: FAR_M, point: new Vector3() };
}

describe('label occlusion', () => {
  it('lets labels show through the force arrows and the hand path', () => {
    expect(blocksLabels(hitInside(FORCE_ARROWS_NAME))).toBe(false);
    expect(blocksLabels(hitInside(HAND_PATH_NAME))).toBe(false);
  });

  it('keeps the swimmer and the pool in front of labels', () => {
    expect(blocksLabels(hitInside('swimmer'))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CUT_PLANE_Z,
  HEART_EXTENT,
  SCENE_EXTENT,
  cm,
  contains,
  cutawayKeeps,
  mm,
  pad,
  union,
} from './scale';

describe('scale', () => {
  it('measures the world in millimetres', () => {
    expect(mm(12)).toBe(12);
    expect(cm(1.2)).toBe(12);
  });

  it('keeps the back half of the heart in the cutaway', () => {
    expect(cutawayKeeps(CUT_PLANE_Z)).toBe(true);
    expect(cutawayKeeps(-5)).toBe(true);
    expect(cutawayKeeps(5)).toBe(false);
  });

  it('fits the heart inside the scene', () => {
    expect(contains(SCENE_EXTENT, [HEART_EXTENT.x[0], HEART_EXTENT.y[0], HEART_EXTENT.z[0]])).toBe(
      true,
    );
    expect(contains(SCENE_EXTENT, [HEART_EXTENT.x[1], HEART_EXTENT.y[1], HEART_EXTENT.z[1]])).toBe(
      true,
    );
  });

  it('unions and pads boxes', () => {
    const merged = union([
      { x: [0, 1], y: [0, 1], z: [0, 1] },
      { x: [-2, 0], y: [2, 3], z: [0, 4] },
    ]);
    expect(merged).toEqual({ x: [-2, 1], y: [0, 3], z: [0, 4] });
    expect(pad(merged, 1)).toEqual({ x: [-3, 2], y: [-1, 4], z: [-1, 5] });
  });
});

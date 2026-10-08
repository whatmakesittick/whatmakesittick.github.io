import { Fog } from 'three';
import { describe, expect, it } from 'vitest';
import { HAZE, SCENE_LIMITS } from './constants';
import { applyHaze, hazeRange } from './haze';

const TURBINE_DISTANCE_M = 600;
const FARM_DISTANCE_M = 12_000;
const FARTHEST_DISTANCE_M = SCENE_LIMITS.cameraMaxDistance;

describe('hazeRange', () => {
  it('keeps the fixed haze for close turbine views', () => {
    expect(hazeRange(TURBINE_DISTANCE_M)).toEqual({ near: HAZE.near, far: HAZE.far });
  });

  it('starts the fog beyond the framed target for distant farm views', () => {
    const { near, far } = hazeRange(FARM_DISTANCE_M);
    expect(near).toBe(FARM_DISTANCE_M * HAZE.nearPerDistance);
    expect(near).toBeGreaterThan(FARM_DISTANCE_M);
    expect(far).toBeLessThanOrEqual(SCENE_LIMITS.cameraFar);
  });

  it('keeps the fog inside the camera range when zoomed out fully', () => {
    const { near, far } = hazeRange(FARTHEST_DISTANCE_M);
    expect(far).toBe(SCENE_LIMITS.cameraFar);
    expect(near).toBeLessThan(far);
  });

  it('grows with the camera distance', () => {
    const close = hazeRange(FARM_DISTANCE_M / 2);
    const far = hazeRange(FARM_DISTANCE_M);
    expect(far.near).toBeGreaterThanOrEqual(close.near);
    expect(far.far).toBeGreaterThanOrEqual(close.far);
  });
});

describe('applyHaze', () => {
  it('moves the scene fog to the range for the distance', () => {
    const scene = { fog: new Fog(HAZE.colour, HAZE.near, HAZE.far) };
    applyHaze(scene, FARM_DISTANCE_M);
    expect({ near: scene.fog.near, far: scene.fog.far }).toEqual(hazeRange(FARM_DISTANCE_M));
  });

  it('ignores a scene without linear fog', () => {
    expect(() => applyHaze({ fog: null }, FARM_DISTANCE_M)).not.toThrow();
  });
});

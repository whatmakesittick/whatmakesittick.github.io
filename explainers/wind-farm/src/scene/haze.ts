import { Fog } from 'three';
import type { Scene } from 'three';
import { clamp } from '@core/math';
import { HAZE, SCENE_LIMITS } from './constants';

export interface HazeRange {
  near: number;
  far: number;
}

export function hazeRange(cameraDistance: number): HazeRange {
  const far = clamp(cameraDistance * HAZE.farPerDistance, HAZE.far, SCENE_LIMITS.cameraFar);
  const near = clamp(cameraDistance * HAZE.nearPerDistance, HAZE.near, far * HAZE.maxNearShare);
  return { near, far };
}

export function applyHaze(scene: Pick<Scene, 'fog'>, cameraDistance: number): void {
  const { fog } = scene;
  if (!(fog instanceof Fog)) return;
  const { near, far } = hazeRange(cameraDistance);
  fog.near = near;
  fog.far = far;
}

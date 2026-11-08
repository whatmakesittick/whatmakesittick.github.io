import { Fog, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { FrameUpdate } from '@core/scene/shell';
import { DEPTH_FOG, depthFogRange, mountDepthFog } from './depthFog';

const BASE = { near: 7, far: 15 } as const;
const CLOSE = 0.4;
const FAR_AWAY = 6;

function harness(distance: number) {
  const scene = new Scene();
  scene.fog = new Fog('#000000', BASE.near, BASE.far);
  const camera = new PerspectiveCamera();
  camera.position.set(0, 0, distance);
  const updates: FrameUpdate[] = [];
  const rig = { camera, controls: { target: new Vector3() } } as never;
  const remove = mountDepthFog({
    scene,
    rig,
    onFrame: (update) => (updates.push(update), () => {}),
  });
  return { fog: scene.fog, frame: () => updates.forEach((update) => update(0)), remove };
}

describe('depth fog', () => {
  it('pulls the fog in around a close view so the far parts recede', () => {
    expect(depthFogRange(CLOSE, BASE)).toEqual({
      near: CLOSE * DEPTH_FOG.near,
      far: CLOSE * DEPTH_FOG.far,
    });
  });

  it('keeps the stage fog for the whole piano', () => {
    expect(depthFogRange(FAR_AWAY, BASE)).toEqual(BASE);
  });

  it('follows the camera each frame and restores the stage fog on unmount', () => {
    const { fog, frame, remove } = harness(CLOSE);
    frame();
    expect(fog.far).toBeCloseTo(CLOSE * DEPTH_FOG.far);
    remove();
    expect([fog.near, fog.far]).toEqual([BASE.near, BASE.far]);
  });
});

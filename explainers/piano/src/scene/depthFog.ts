import { Fog, MathUtils } from 'three';
import type { SceneShell } from '@core/scene/shell';

export interface FogRange {
  near: number;
  far: number;
}

export const DEPTH_FOG: Readonly<FogRange> = { near: 1, far: 1.9 };
export const DEPTH_FOG_FADE = { from: 1.5, to: 3 } as const;

export function depthFogRange(distance: number, base: FogRange): FogRange {
  const stage = MathUtils.smoothstep(distance, DEPTH_FOG_FADE.from, DEPTH_FOG_FADE.to);
  return {
    near: MathUtils.lerp(distance * DEPTH_FOG.near, base.near, stage),
    far: MathUtils.lerp(distance * DEPTH_FOG.far, base.far, stage),
  };
}

export function mountDepthFog(shell: Pick<SceneShell, 'scene' | 'rig' | 'onFrame'>): () => void {
  const { fog } = shell.scene;
  if (!(fog instanceof Fog)) return () => {};
  const base: FogRange = { near: fog.near, far: fog.far };
  const { camera, controls } = shell.rig;
  const removeFrame = shell.onFrame(() => {
    const range = depthFogRange(camera.position.distanceTo(controls.target), base);
    fog.near = range.near;
    fog.far = range.far;
  });
  return () => {
    removeFrame();
    fog.near = base.near;
    fog.far = base.far;
  };
}

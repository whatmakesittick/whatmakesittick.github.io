import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { EngineStore } from '../state';
import { bindStore } from './bindings';
import { DIM_OPACITY, SCENE_LIMITS } from './constants';
import { EngineController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { EngineController } from './controller';
export type { EngineControllerDependencies, ViewFramer } from './controller';

export const UNDIMMED_PARTS = ['person', 'coldStream', 'hotStream'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: { opacity: DIM_OPACITY }, undimmed: [...UNDIMMED_PARTS] },
};

const applyLight = (): (() => void) => () => {};

export async function mountEngineScene(shell: SceneShell, store: EngineStore): Promise<() => void> {
  const restoreLight = applyLight();
  const engine = new EngineController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => engine.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { engine, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    engine.dispose();
    restoreLight();
  };
}

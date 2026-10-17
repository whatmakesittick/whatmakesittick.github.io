import { toRadians } from '@core/math';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import { SITE } from '../model';
import type { ThrusterCarStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { ThrusterCarController } from './controller';
import { LABEL_PRIORITY, UNDIMMED_PARTS } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { ThrusterCarController } from './controller';
export type { ThrusterCarControllerDependencies, ViewFramer } from './controller';

const SCENE_LIMITS = {
  fogFar: 700,
  cameraNear: 0.1,
  cameraFar: 800,
  cameraMinDistance: 2,
  cameraMaxDistance: 500,
  maxPolarAngle: toRadians(95),
} as const;

const DUSK_DIM = { saturation: 0.3, brightness: 0.8 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.skyMiddle,
  fog: { color: THEME.fog, near: SITE.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'right',
  highlight: { dim: DUSK_DIM, undimmed: UNDIMMED_PARTS },
};

export function mountThrusterCarScene(shell: SceneShell, store: ThrusterCarStore): () => void {
  const car = new ThrusterCarController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => car.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { car, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    car.dispose();
  };
}

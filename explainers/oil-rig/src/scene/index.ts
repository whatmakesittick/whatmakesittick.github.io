import { toRadians } from '@core/math';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { OilRigStore } from '../state';
import { bindStore } from './bindings';
import { OilRigController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const SKY_COLOR = '#132a3e';
const CAMERA = {
  near: 1,
  far: 4000,
  belowHorizon: toRadians(6),
  distance: { min: 4, max: 3000 },
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: SKY_COLOR,
  stage: false,
  camera: {
    near: CAMERA.near,
    far: CAMERA.far,
    maxPolarAngle: Math.PI / 2 + CAMERA.belowHorizon,
    distance: CAMERA.distance,
  },
};

export function mountOilRigScene(shell: SceneShell, store: OilRigStore): () => void {
  const oilRig = new OilRigController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => oilRig.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { oilRig, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    oilRig.dispose();
  };
}

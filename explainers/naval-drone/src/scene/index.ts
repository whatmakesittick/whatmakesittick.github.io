import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { PartId } from '../ids';
import type { NavalDroneStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { NavalDroneController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const UNDIMMED: readonly PartId[] = [
  'jetStream',
  'bowWave',
  'spray',
  'wake',
  'wettedLength',
  'videoGhost',
  'satLink',
  'backupLink',
];

const HAZE = { near: 400, far: 5000 } as const;
const CAMERA = { near: 0.05, far: 9000, minDistance: 1, maxDistance: 2500 } as const;
const HIGHLIGHT_DIM = { saturation: 0.6, brightness: 0.72, emissive: 0.5 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.haze,
  fog: { color: THEME.haze, near: HAZE.near, far: HAZE.far },
  stage: false,
  camera: {
    near: CAMERA.near,
    far: CAMERA.far,
    maxPolarAngle: Math.PI / 2,
    distance: { min: CAMERA.minDistance, max: CAMERA.maxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED },
};

export function mountNavalDroneScene(shell: SceneShell, store: NavalDroneStore): () => void {
  const navalDrone = new NavalDroneController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => navalDrone.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { navalDrone, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    navalDrone.dispose();
  };
}

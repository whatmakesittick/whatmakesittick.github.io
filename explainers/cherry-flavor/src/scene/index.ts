import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { FlavorStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { FlavorController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { FlavorController } from './controller';
export type { FlavorControllerDependencies, ViewFramer } from './controller';

export const UNDIMMED_PARTS = ['bite', 'aromaCloud'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sceneBackground,
  fog: { color: THEME.sceneBackground, near: 200, far: 800 },
  stage: false,
  camera: {
    near: 0.1,
    far: 1000,
    maxPolarAngle: Math.PI * 0.85,
    distance: { min: 6, max: 160 },
  },
  gaugeSide: 'right',
  highlight: { undimmed: [...UNDIMMED_PARTS] },
};

export function mountCherryFlavorScene(shell: SceneShell, store: FlavorStore): () => void {
  const flavor = new FlavorController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => flavor.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { flavor, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    flavor.dispose();
  };
}

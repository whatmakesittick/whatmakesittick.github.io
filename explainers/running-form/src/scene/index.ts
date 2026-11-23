import type { SceneOptions } from '@core/scene/shell';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import { THEME } from '../theme';
import type { RunStore } from '../state';
import { bindStore } from './bindings';
import { RunController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { RunController } from './controller';
export type { RunControllerDependencies, ViewFramer } from './controller';

const FOG = { near: 60, far: 1400 } as const;
const CAMERA_LIMITS = {
  near: 0.05,
  far: 4000,
  maxPolarAngle: Math.PI / 2 - 0.04,
  distance: { min: 0.5, max: 14 },
} as const;
const UNDIMMED_PARTS = ['road', 'backdrop'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.haze,
  fog: { color: THEME.haze, ...FOG },
  stage: false,
  camera: CAMERA_LIMITS,
  gaugeSide: 'top',
  highlight: { undimmed: [...UNDIMMED_PARTS] },
};

export async function mountRunScene(shell: SceneShell, store: RunStore): Promise<() => void> {
  const run = new RunController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => run.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const release = () => {
    removeFrame();
    labelVisibility.dispose();
    run.dispose();
  };
  try {
    const unbind = await bindStore(store, { run, labelVisibility, ...shell });
    return () => {
      unbind();
      release();
    };
  } catch (error) {
    release();
    throw error;
  }
}

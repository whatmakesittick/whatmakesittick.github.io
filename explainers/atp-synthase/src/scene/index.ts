import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { AtpSynthaseStore } from '../state';
import { bindStore } from './bindings';
import { AtpSynthaseController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const BACKGROUND = '#070b14';
const FOG = { color: BACKGROUND, near: 900, far: 3600 } as const;
const CAMERA = {
  near: 1,
  far: 8000,
  maxPolarAngle: Math.PI * 0.85,
  distance: { min: 30, max: 3200 },
} as const;
const CELL_DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.3 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: BACKGROUND,
  fog: FOG,
  stage: false,
  camera: CAMERA,
  highlight: { dim: CELL_DIM },
};

export function mountAtpSynthaseScene(shell: SceneShell, store: AtpSynthaseStore): () => void {
  const synthase = new AtpSynthaseController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => synthase.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { synthase, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    synthase.dispose();
  };
}

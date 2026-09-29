import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { RaptorStore } from '../state';
import { bindStore } from './bindings';
import { RaptorController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const NIGHT_SKY = '#070b16';
const CAMERA = {
  near: 2,
  far: 30000,
  maxPolarAngle: Math.PI * 0.92,
  distance: { min: 60, max: 8000 },
} as const;
const CUTAWAY_DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.3, opacity: 0.35 } as const;
const UNDIMMED_GLOW = [
  'liquidOxygen',
  'liquidMethane',
  'oxygenRichGas',
  'methaneRichGas',
  'plume',
] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: NIGHT_SKY,
  stage: false,
  camera: CAMERA,
  highlight: { dim: CUTAWAY_DIM, undimmed: UNDIMMED_GLOW },
};

export function mountRaptorScene(shell: SceneShell, store: RaptorStore): () => void {
  const raptor = new RaptorController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => raptor.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { raptor, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    raptor.dispose();
  };
}

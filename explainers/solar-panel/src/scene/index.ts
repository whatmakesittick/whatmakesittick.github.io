import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { SolarPanelStore } from '../state';
import { bindStore } from './bindings';
import { SolarPanelController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const HORIZON = '#2a3b57';
const CAMERA = {
  near: 1,
  far: 6000,
  maxPolarAngle: Math.PI * 0.52,
  distance: { min: 20, max: 4000 },
} as const;
const GHOST_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35, opacity: 0.4 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: HORIZON,
  stage: false,
  camera: CAMERA,
  highlight: { dim: GHOST_DIM },
};

export function mountSolarPanelScene(shell: SceneShell, store: SolarPanelStore): () => void {
  const solarPanel = new SolarPanelController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => solarPanel.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { solarPanel, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    solarPanel.dispose();
  };
}

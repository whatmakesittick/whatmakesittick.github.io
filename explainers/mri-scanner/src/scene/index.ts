import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { MriScannerStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { MriScannerController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { MriScannerController } from './controller';
export type { MriScannerControllerDependencies, ViewFramer } from './controller';

type LightName = 'key' | 'fill' | 'rim';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [x: number, y: number, z: number];
}

const MRI_SCANNER_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: { color: '#fff4e6', intensity: 2.2, position: [0, 80, 45] },
  fill: { color: '#b8d0f0', intensity: 0.6, position: [-70, 30, 25] },
  rim: { color: '#cfe0ff', intensity: 1.2, position: [80, 25, 25] },
};

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.background,
  stage: false,
  camera: { near: 0.05, far: 60, distance: { min: 0.3, max: 12 } },
  highlight: { undimmed: ['room', 'fieldLinesGroup'] },
};

function applyLight(light: DirectionalLight, setting: LightSetting): () => void {
  const color = light.color.clone();
  const intensity = light.intensity;
  const position = light.position.clone();
  light.color.set(setting.color);
  light.intensity = setting.intensity;
  light.position.fromArray(setting.position);
  return () => {
    light.color.copy(color);
    light.intensity = intensity;
    light.position.copy(position);
  };
}

function mriScannerLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(MRI_SCANNER_LIGHT) as LightName[]).map((name) =>
    applyLight(lighting[name], MRI_SCANNER_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

export function mountMriScannerScene(shell: SceneShell, store: MriScannerStore): () => void {
  const restoreLight = mriScannerLight(shell.lighting);
  const mriScanner = new MriScannerController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => mriScanner.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { mriScanner, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    mriScanner.dispose();
    restoreLight();
  };
}

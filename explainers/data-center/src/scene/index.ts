import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { DataCenterStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { DataCenterController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

type Triple = readonly [number, number, number];
type LightName = 'key' | 'fill' | 'rim';

export const SITE_GROUP = 'site';

const HAZE = { color: THEME.fog, near: 250, far: 1600 } as const;
const HIGHLIGHT_DIM = { saturation: 0.4, brightness: 0.7, emissive: 0.3 } as const;
const CAMERA_LIMITS = {
  near: 0.05,
  far: 3000,
  maxPolarAngle: Math.PI * 0.53,
  distance: { min: 0.6, max: 600 },
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sky,
  fog: HAZE,
  stage: false,
  camera: CAMERA_LIMITS,
  highlight: { dim: HIGHLIGHT_DIM, undimmed: [SITE_GROUP] },
};

const LIGHT_DISTANCE = 300;
const LIGHT_NAMES: readonly LightName[] = ['key', 'fill', 'rim'];
const SOFT_LIGHT: Readonly<
  Record<LightName, { color: string; intensity: number; direction: Triple }>
> = {
  key: { color: THEME.keyLight, intensity: 1.8, direction: [-0.55, 0.75, 0.45] },
  fill: { color: THEME.fillLight, intensity: 0.75, direction: [0.5, 0.55, -0.45] },
  rim: { color: THEME.fillLight, intensity: 0.6, direction: [0.2, 0.4, -0.9] },
};

function soften(light: DirectionalLight, name: LightName): () => void {
  const { color, intensity, direction } = SOFT_LIGHT[name];
  const savedColor = light.color.clone();
  const savedIntensity = light.intensity;
  const savedPosition = light.position.clone();
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(...direction).setLength(LIGHT_DISTANCE);
  return () => {
    light.color.copy(savedColor);
    light.intensity = savedIntensity;
    light.position.copy(savedPosition);
  };
}

function softLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => soften(lighting[name], name));
  return () => restorers.forEach((restore) => restore());
}

export function mountDataCenterScene(shell: SceneShell, store: DataCenterStore): () => void {
  const restoreLight = softLight(shell.lighting);
  const dataCenter = new DataCenterController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => dataCenter.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { dataCenter, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    dataCenter.dispose();
    restoreLight();
  };
}

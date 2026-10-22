import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { MaglevTrainStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { MaglevTrainController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

type Triple = readonly [x: number, y: number, z: number];
type LightName = 'key' | 'fill' | 'rim';

interface LightSetting {
  color: string;
  intensity: number;
  direction: Triple;
}

const LINE_GROUP = 'line';

const SCENE_LIMITS = {
  fogNear: 600,
  fogFar: 1100,
  cameraNear: 0.1,
  cameraFar: 3000,
  cameraMinDistance: 1.5,
  cameraMaxDistance: 400,
  maxPolarAngle: Math.PI * 0.6,
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sky,
  fog: { color: THEME.fog, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'right',
  highlight: { undimmed: [LINE_GROUP] },
};

const LIGHT_DISTANCE = 300;

const SCENE_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: { color: THEME.keyLight, intensity: 2.6, direction: [0.65, 0.35, -0.68] },
  fill: { color: THEME.fillLight, intensity: 0.8, direction: [-0.3, 1, 0.45] },
  rim: { color: THEME.fog, intensity: 1, direction: [-0.8, 0.3, 0.55] },
};

const LIGHT_NAMES = Object.keys(SCENE_LIGHT) as LightName[];

function applyLight(light: DirectionalLight, setting: LightSetting): () => void {
  const savedColor = light.color.clone();
  const savedIntensity = light.intensity;
  const savedPosition = light.position.clone();
  light.color.set(setting.color);
  light.intensity = setting.intensity;
  light.position.set(...setting.direction).setLength(LIGHT_DISTANCE);
  return () => {
    light.color.copy(savedColor);
    light.intensity = savedIntensity;
    light.position.copy(savedPosition);
  };
}

function applySceneLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => applyLight(lighting[name], SCENE_LIGHT[name]));
  return () => restorers.forEach((restore) => restore());
}

export function mountMaglevTrainScene(shell: SceneShell, store: MaglevTrainStore): () => void {
  const restoreLight = applySceneLight(shell.lighting);
  const train = new MaglevTrainController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => train.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { train, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    train.dispose();
    restoreLight();
  };
}

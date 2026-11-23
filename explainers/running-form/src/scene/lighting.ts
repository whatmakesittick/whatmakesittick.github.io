import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { SUN_DIR } from '../model/layout';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const SUN_DISTANCE_M = 100;

const RUN_LIGHT: Record<LightName, LightSetting> = {
  key: {
    color: '#ffc58e',
    intensity: 2.6,
    position: [
      SUN_DIR[0] * SUN_DISTANCE_M,
      SUN_DIR[1] * SUN_DISTANCE_M,
      SUN_DIR[2] * SUN_DISTANCE_M,
    ],
  },
  fill: { color: '#b8c8e4', intensity: 1.22, position: [70, 55, 60] },
  rim: { color: '#ffb47a', intensity: 1.4, position: [-45, 38, -80] },
};

function apply(light: DirectionalLight, setting: LightSetting): () => void {
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

export function runLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(RUN_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], RUN_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

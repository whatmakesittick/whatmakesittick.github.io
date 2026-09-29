import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const HEART_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff0e0', intensity: 2.6, position: [-70, 110, 110] },
  fill: { color: '#b4ccff', intensity: 0.8, position: [110, 10, 60] },
  rim: { color: '#ffd9d0', intensity: 2, position: [30, 60, -140] },
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

export function heartLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(HEART_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], HEART_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

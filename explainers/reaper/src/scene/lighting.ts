import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

export const REAPER_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: { color: '#ffc08a', intensity: 3, position: [380, 300, -900] },
  fill: { color: '#8ea8ff', intensity: 0.9, position: [-250, 900, 450] },
  rim: { color: '#d9a6c8', intensity: 1.3, position: [-420, 180, 950] },
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

export function reaperLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(REAPER_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], REAPER_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

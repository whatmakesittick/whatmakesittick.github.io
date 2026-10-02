import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

export const FPV_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: { color: '#dfe7f0', intensity: 2.2, position: [-180, 420, -560] },
  fill: { color: '#b7c4d4', intensity: 0.95, position: [320, 520, 420] },
  rim: { color: '#cdd7e4', intensity: 0.6, position: [260, 140, 640] },
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

export function fpvLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(FPV_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], FPV_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

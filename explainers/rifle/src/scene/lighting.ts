import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const RIFLE_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#ffe6c7', intensity: 3, position: [320, 420, 520] },
  fill: { color: '#a9c8ff', intensity: 0.8, position: [-460, 80, 280] },
  rim: { color: '#d6e6ff', intensity: 3.2, position: [-120, 380, -460] },
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

export function rifleLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(RIFLE_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], RIFLE_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const RIFLE_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff1e0', intensity: 2.8, position: [260, 420, 520] },
  fill: { color: '#bcd6ff', intensity: 0.9, position: [-420, 60, 300] },
  rim: { color: '#cfe0ff', intensity: 2.2, position: [-160, 360, -420] },
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

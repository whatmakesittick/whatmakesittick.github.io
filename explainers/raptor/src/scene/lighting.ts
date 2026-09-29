import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const RAPTOR_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#ffe7cc', intensity: 3, position: [160, 220, 260] },
  fill: { color: '#9fbcff', intensity: 0.9, position: [-260, 40, 120] },
  rim: { color: '#cfe0ff', intensity: 3.4, position: [-120, 140, -300] },
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

export function raptorLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(RAPTOR_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], RAPTOR_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

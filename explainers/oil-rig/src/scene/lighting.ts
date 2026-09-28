import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  color: string;
  intensity: number;
  position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const SEA_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff0d8', intensity: 3.1, position: [170, 150, 50] },
  fill: { color: '#b9d4f2', intensity: 0.4, position: [-120, 40, 90] },
  rim: { color: '#a9ccff', intensity: 1.2, position: [-60, 90, -140] },
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

export function seaLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(SEA_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], SEA_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

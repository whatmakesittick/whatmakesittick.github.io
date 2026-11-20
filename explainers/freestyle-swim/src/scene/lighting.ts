import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const SWIM_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff3e2', intensity: 2.4, position: [40, 110, 50] },
  fill: { color: '#a9d4ec', intensity: 0.7, position: [-60, -30, 70] },
  rim: { color: '#cfe8ff', intensity: 1.6, position: [-50, 40, -120] },
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

export function swimLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(SWIM_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], SWIM_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

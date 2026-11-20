import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const SWIM_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#f4f8ff', intensity: 2.1, position: [25, 120, 35] },
  fill: { color: '#ffdcb8', intensity: 0.9, position: [60, -50, 90] },
  rim: { color: '#a8d3ff', intensity: 2.5, position: [-70, 45, -100] },
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

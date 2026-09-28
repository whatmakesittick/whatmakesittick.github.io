import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const CELL_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff2e2', intensity: 2.5, position: [70, 110, 90] },
  fill: { color: '#a9c4ff', intensity: 0.9, position: [-90, 20, 50] },
  rim: { color: '#8fb8ff', intensity: 1.9, position: [-40, 70, -120] },
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

export function cellLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(CELL_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], CELL_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

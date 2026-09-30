import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const BLACK_HOLE_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#cfe0ff', intensity: 2.2, position: [30, -40, 50] },
  fill: { color: '#9fb6ff', intensity: 0.35, position: [-60, 30, 20] },
  rim: { color: '#ffb066', intensity: 1.8, position: [20, -10, -70] },
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

export function blackHoleLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(BLACK_HOLE_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], BLACK_HOLE_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  color: string;
  intensity: number;
  position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const BENCH_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#fff1dc', intensity: 3.2, position: [-70, 110, 150] },
  fill: { color: '#c7dbff', intensity: 0.9, position: [60, 30, -140] },
  rim: { color: '#a9c8ff', intensity: 1.3, position: [150, 70, -30] },
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

export function benchLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(BENCH_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], BENCH_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

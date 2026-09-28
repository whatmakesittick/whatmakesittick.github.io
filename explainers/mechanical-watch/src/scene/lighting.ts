import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';

interface LightSetting {
  color: string;
  intensity: number;
  position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

const BENCH_LIGHT: Record<LightName, LightSetting> = {
  key: { color: '#ffe8c8', intensity: 2.8, position: [-90, 120, 140] },
  fill: { color: '#c2d6f2', intensity: 0.5, position: [90, 30, -120] },
  rim: { color: '#d6e2f5', intensity: 0.6, position: [70, 140, -60] },
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

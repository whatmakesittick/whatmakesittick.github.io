import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { LIGHT_RIG } from './constants';

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

type LightName = 'key' | 'fill' | 'rim';

function scaled(direction: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(...direction);
  return direction.map((value) => (value / length) * LIGHT_RIG.distance) as [
    number,
    number,
    number,
  ];
}

export const NAVAL_DRONE_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: {
    color: LIGHT_RIG.key.color,
    intensity: LIGHT_RIG.key.intensity,
    position: scaled(LIGHT_RIG.sun),
  },
  fill: {
    color: LIGHT_RIG.fill.color,
    intensity: LIGHT_RIG.fill.intensity,
    position: scaled(LIGHT_RIG.fill.direction),
  },
  rim: {
    color: LIGHT_RIG.rim.color,
    intensity: LIGHT_RIG.rim.intensity,
    position: scaled(LIGHT_RIG.rim.direction),
  },
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

export function navalDroneLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(NAVAL_DRONE_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], NAVAL_DRONE_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

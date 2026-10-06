import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { LIGHT_RIG } from './constants';

type Triple = readonly [number, number, number];

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: Triple;
}

type LightName = 'key' | 'fill' | 'rim';

function scaled(direction: Triple): Triple {
  const length = Math.hypot(...direction);
  return direction.map((value) => (value / length) * LIGHT_RIG.distance) as unknown as Triple;
}

export const MRI_SCANNER_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: {
    color: LIGHT_RIG.key.color,
    intensity: LIGHT_RIG.key.intensity,
    position: scaled(LIGHT_RIG.key.direction),
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
  light.position.set(...setting.position);
  return () => {
    light.color.copy(color);
    light.intensity = intensity;
    light.position.copy(position);
  };
}

export function mriScannerLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = (Object.keys(MRI_SCANNER_LIGHT) as LightName[]).map((name) =>
    apply(lighting[name], MRI_SCANNER_LIGHT[name]),
  );
  return () => restorers.forEach((restore) => restore());
}

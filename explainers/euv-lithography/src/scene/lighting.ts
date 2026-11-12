import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import type { Point } from '../ids';
import { THEME } from '../theme';

type LightName = 'key' | 'fill' | 'rim';

interface LightSpec {
  color: string;
  intensity: number;
  direction: Point;
}

const LIGHT_NAMES: readonly LightName[] = ['key', 'fill', 'rim'];
const LIGHT_DISTANCE = 30;

export const LIGHT_RIG: Readonly<Record<LightName, LightSpec>> = {
  key: { color: THEME.keyLight, intensity: 2.6, direction: [-0.25, 0.9, 0.35] },
  fill: { color: THEME.fillLight, intensity: 0.45, direction: [0.8, 0.3, 0.5] },
  rim: { color: '#ffe9d6', intensity: 1.2, direction: [-0.2, 0.5, -0.85] },
};

function apply(light: DirectionalLight, name: LightName): () => void {
  const { color, intensity, direction } = LIGHT_RIG[name];
  const savedColor = light.color.clone();
  const savedIntensity = light.intensity;
  const savedPosition = light.position.clone();
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(...direction).setLength(LIGHT_DISTANCE);
  return () => {
    light.color.copy(savedColor);
    light.intensity = savedIntensity;
    light.position.copy(savedPosition);
  };
}

export function euvLithographyLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => apply(lighting[name], name));
  return () => restorers.forEach((restore) => restore());
}

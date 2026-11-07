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

export const LIGHT_RIG: Readonly<Record<LightName, LightSpec>> & { distance: number } = {
  distance: 12,
  key: { color: THEME.keyLight, intensity: 2.6, direction: [-0.5, 0.78, 0.38] },
  fill: { color: THEME.fillLight, intensity: 0.55, direction: [0.85, 0.32, 0.25] },
  rim: { color: '#fff6ea', intensity: 1.9, direction: [-0.3, 0.58, -0.76] },
};

function apply(light: DirectionalLight, name: LightName): () => void {
  const { color, intensity, direction } = LIGHT_RIG[name];
  const savedColor = light.color.clone();
  const savedIntensity = light.intensity;
  const savedPosition = light.position.clone();
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(...direction).setLength(LIGHT_RIG.distance);
  return () => {
    light.color.copy(savedColor);
    light.intensity = savedIntensity;
    light.position.copy(savedPosition);
  };
}

export function pianoLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => apply(lighting[name], name));
  return () => restorers.forEach((restore) => restore());
}

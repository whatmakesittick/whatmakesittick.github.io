import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { LIGHT_RIG } from './constants';

type LightName = 'key' | 'fill' | 'rim';

const LIGHT_NAMES: readonly LightName[] = ['key', 'fill', 'rim'];

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

export function dataCenterLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => apply(lighting[name], name));
  return () => restorers.forEach((restore) => restore());
}

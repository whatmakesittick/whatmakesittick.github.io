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

const LIGHT_NAMES: readonly LightName[] = ['key', 'fill', 'rim'];

function placed(direction: Triple): Triple {
  const length = Math.hypot(...direction);
  const [x, y, z] = direction.map((value) => (value / length) * LIGHT_RIG.distance);
  return [x, y, z];
}

function setting(name: LightName): LightSetting {
  const { color, intensity, direction } = LIGHT_RIG[name];
  return { color, intensity, position: placed(direction) };
}

const THRUSTER_CAR_LIGHT: Readonly<Record<LightName, LightSetting>> = {
  key: setting('key'),
  fill: setting('fill'),
  rim: setting('rim'),
};

function apply(light: DirectionalLight, { color, intensity, position }: LightSetting): () => void {
  const savedColor = light.color.clone();
  const savedIntensity = light.intensity;
  const savedPosition = light.position.clone();
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(...position);
  return () => {
    light.color.copy(savedColor);
    light.intensity = savedIntensity;
    light.position.copy(savedPosition);
  };
}

export function thrusterCarLight(lighting: Pick<Lighting, LightName>): () => void {
  const restorers = LIGHT_NAMES.map((name) => apply(lighting[name], THRUSTER_CAR_LIGHT[name]));
  return () => restorers.forEach((restore) => restore());
}

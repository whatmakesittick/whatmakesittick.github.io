import { DirectionalLight, Group } from 'three';
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
  key: { color: THEME.keyLight, intensity: 3.1, direction: [-0.32, 0.86, 0.4] },
  fill: { color: THEME.fillLight, intensity: 0.4, direction: [0.85, 0.32, 0.25] },
  rim: { color: '#fff6ea', intensity: 1.9, direction: [-0.16, 0.55, -0.82] },
};

const CLOSE_LIGHT_NAMES = ['rake', 'rim'] as const;

type CloseLightName = (typeof CLOSE_LIGHT_NAMES)[number];

export const CLOSE_LIGHT_RIG: Readonly<Record<CloseLightName, LightSpec>> = {
  rake: { color: '#ffe0b8', intensity: 2.4, direction: [-0.55, 0.8, -0.4] },
  rim: { color: '#fff3e2', intensity: 2, direction: [0.7, 0.55, -0.55] },
};

export class CloseLights {
  readonly root = new Group();
  private readonly lights: readonly [DirectionalLight, LightSpec][];

  constructor() {
    this.root.name = 'closeLights';
    this.lights = CLOSE_LIGHT_NAMES.map((name) => {
      const spec = CLOSE_LIGHT_RIG[name];
      const light = new DirectionalLight(spec.color, 0);
      light.position.set(...spec.direction).setLength(LIGHT_RIG.distance);
      this.root.add(light);
      return [light, spec];
    });
  }

  set(amount: number): void {
    this.lights.forEach(([light, spec]) => (light.intensity = spec.intensity * amount));
  }
}

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

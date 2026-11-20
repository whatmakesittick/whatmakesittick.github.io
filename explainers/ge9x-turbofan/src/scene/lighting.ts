import type { DirectionalLight } from 'three';
import type { Lighting } from '@core/scene/lighting';
import { activeScheme } from '@core/theme';
import type { Scheme } from '@core/theme';

type Triple = readonly [number, number, number];

interface LightSetting {
  readonly color: string;
  readonly intensity: number;
  readonly position: Triple;
}

type LightName = 'key' | 'fill' | 'rim';

const LIGHT_NAMES: readonly LightName[] = ['key', 'fill', 'rim'];

const POSITIONS: Readonly<Record<LightName, Triple>> = {
  key: [-55, 85, 60],
  fill: [70, 20, 55],
  rim: [80, 45, -70],
};

const TONES: Readonly<Record<Scheme, Record<LightName, Omit<LightSetting, 'position'>>>> = {
  dark: {
    key: { color: '#fff0dc', intensity: 2.7 },
    fill: { color: '#a9bfe0', intensity: 0.6 },
    rim: { color: '#b9d4ff', intensity: 2.4 },
  },
  light: {
    key: { color: '#fff3e4', intensity: 2.5 },
    fill: { color: '#dfe7f3', intensity: 0.9 },
    rim: { color: '#c6daf7', intensity: 1.3 },
  },
};

export function ge9xLightSettings(scheme: Scheme): Readonly<Record<LightName, LightSetting>> {
  const tones = TONES[scheme];
  return {
    key: { ...tones.key, position: POSITIONS.key },
    fill: { ...tones.fill, position: POSITIONS.fill },
    rim: { ...tones.rim, position: POSITIONS.rim },
  };
}

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

export function ge9xLight(
  lighting: Pick<Lighting, LightName>,
  scheme: Scheme = activeScheme(),
): () => void {
  const settings = ge9xLightSettings(scheme);
  const restorers = LIGHT_NAMES.map((name) => apply(lighting[name], settings[name]));
  return () => restorers.forEach((restore) => restore());
}

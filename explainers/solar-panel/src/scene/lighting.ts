import { Color, Vector3 } from 'three';
import type { DirectionalLight } from 'three';
import { clamp, smoothstep, toRadians } from '@core/math';
import type { Lighting } from '@core/scene/lighting';
import { sunAzimuthDeg, sunElevationDeg } from '../model';

type LightName = 'key' | 'fill' | 'rim';

interface LightSetting {
  color: string;
  intensity: number;
  position: readonly [number, number, number];
}

const STEADY: Record<Exclude<LightName, 'key'>, LightSetting> = {
  fill: { color: '#b8cdf5', intensity: 0.42, position: [-600, 700, -500] },
  rim: { color: '#ffe3c4', intensity: 0.45, position: [500, 300, -900] },
};

const KEY = {
  distance: 1500,
  lowestDeg: 6,
  dayIntensity: 3.1,
  nightIntensity: 0.38,
  darkBelowDeg: -6,
  fullAboveDeg: 14,
  night: '#8ea4ff',
  horizon: '#ffae70',
  day: '#fff3e0',
  warmUntilDeg: 25,
} as const;

export interface KeyLightSetting {
  direction: Vector3;
  color: Color;
  intensity: number;
}

export function keyLight(minute: number): KeyLightSetting {
  const elevation = sunElevationDeg(minute);
  const lifted = toRadians(Math.max(elevation, KEY.lowestDeg));
  const azimuth = toRadians(sunAzimuthDeg(minute));
  const direction = new Vector3(
    Math.cos(lifted) * Math.sin(azimuth),
    Math.sin(lifted),
    -Math.cos(lifted) * Math.cos(azimuth),
  );
  const daylightShare = smoothstep(elevation, KEY.darkBelowDeg, KEY.fullAboveDeg);
  const warmth = clamp(elevation / KEY.warmUntilDeg, 0, 1);
  const color = new Color(KEY.horizon).lerp(new Color(KEY.day), warmth);
  color.lerp(new Color(KEY.night), 1 - smoothstep(elevation, KEY.darkBelowDeg, 0));
  const intensity = KEY.nightIntensity + (KEY.dayIntensity - KEY.nightIntensity) * daylightShare;
  return { direction, color, intensity };
}

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

export interface Daylight {
  follow(minute: number): void;
  restore(): void;
}

export function daylight(lighting: Pick<Lighting, LightName>): Daylight {
  const { key } = lighting;
  const saved = {
    color: key.color.clone(),
    intensity: key.intensity,
    position: key.position.clone(),
  };
  const restorers = (Object.keys(STEADY) as Exclude<LightName, 'key'>[]).map((name) =>
    apply(lighting[name], STEADY[name]),
  );
  let followed: number | null = null;
  return {
    follow: (minute) => {
      if (minute === followed) return;
      followed = minute;
      const setting = keyLight(minute);
      key.position.copy(setting.direction).multiplyScalar(KEY.distance);
      key.color.copy(setting.color);
      key.intensity = setting.intensity;
    },
    restore: () => {
      restorers.forEach((restore) => restore());
      key.color.copy(saved.color);
      key.intensity = saved.intensity;
      key.position.copy(saved.position);
    },
  };
}

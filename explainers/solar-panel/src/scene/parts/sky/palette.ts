import { Color } from 'three';
import { clamp } from '@core/math';
import { SOLAR_NOON_MIN, sunElevationDeg } from '../../../model';

interface SkyKey {
  elevation: number;
  zenith: string;
  horizon: string;
  ground: string;
  glow: string;
  strength: number;
  sun: string;
}

const NIGHT: SkyKey = {
  elevation: -12,
  zenith: '#060b20',
  horizon: '#111a3a',
  ground: '#070a14',
  glow: '#2a2f5c',
  strength: 0,
  sun: '#ff7a3d',
};

const HIGH_SUN: readonly SkyKey[] = [
  {
    elevation: 20,
    zenith: '#3b7ad2',
    horizon: '#bfe0ff',
    ground: '#6d7a70',
    glow: '#fff2d8',
    strength: 0.45,
    sun: '#fff1cf',
  },
  {
    elevation: 50,
    zenith: '#2c6ccc',
    horizon: '#a9d4ff',
    ground: '#728077',
    glow: '#fffaf0',
    strength: 0.4,
    sun: '#fff8e6',
  },
];

const MORNING: readonly SkyKey[] = [
  NIGHT,
  {
    elevation: -6,
    zenith: '#0e1940',
    horizon: '#3b3b70',
    ground: '#0f1224',
    glow: '#8a5a8a',
    strength: 0.25,
    sun: '#ff7a3d',
  },
  {
    elevation: -2,
    zenith: '#1c2c5e',
    horizon: '#d97a8c',
    ground: '#262234',
    glow: '#ff9a7a',
    strength: 0.6,
    sun: '#ff7f45',
  },
  {
    elevation: 2,
    zenith: '#385a9c',
    horizon: '#ffae88',
    ground: '#4a4a4e',
    glow: '#ffbe7a',
    strength: 0.95,
    sun: '#ff9a4a',
  },
  {
    elevation: 8,
    zenith: '#4d82ca',
    horizon: '#ffd6b0',
    ground: '#5f6660',
    glow: '#ffe0a8',
    strength: 0.7,
    sun: '#ffc46b',
  },
  ...HIGH_SUN,
];

const EVENING: readonly SkyKey[] = [
  NIGHT,
  {
    elevation: -7,
    zenith: '#110e32',
    horizon: '#3b2f6a',
    ground: '#0d0c1e',
    glow: '#7a5ab0',
    strength: 0.2,
    sun: '#ff6a3d',
  },
  {
    elevation: -3,
    zenith: '#282360',
    horizon: '#a988f0',
    ground: '#221c36',
    glow: '#ff8a8a',
    strength: 0.5,
    sun: '#ff6a3d',
  },
  {
    elevation: 1,
    zenith: '#44539a',
    horizon: '#ff9a6a',
    ground: '#48404a',
    glow: '#ffb070',
    strength: 0.95,
    sun: '#ff8a3d',
  },
  {
    elevation: 8,
    zenith: '#4d82ca',
    horizon: '#ffcf9f',
    ground: '#5f6660',
    glow: '#ffd8a0',
    strength: 0.7,
    sun: '#ffbb60',
  },
  ...HIGH_SUN,
];

export interface SkyPalette {
  zenith: Color;
  horizon: Color;
  ground: Color;
  glow: Color;
  sun: Color;
  strength: number;
}

function keysFor(minute: number): readonly SkyKey[] {
  return minute <= SOLAR_NOON_MIN ? MORNING : EVENING;
}

function mix(from: string, to: string, share: number): Color {
  return new Color(from).lerp(new Color(to), share);
}

export function skyPalette(minute: number): SkyPalette {
  const keys = keysFor(minute);
  const elevation = clamp(
    sunElevationDeg(minute),
    keys[0].elevation,
    keys[keys.length - 1].elevation,
  );
  const upper = Math.max(
    1,
    keys.findIndex((key) => key.elevation >= elevation),
  );
  const from = keys[upper - 1];
  const to = keys[upper];
  const share = (elevation - from.elevation) / (to.elevation - from.elevation);
  return {
    zenith: mix(from.zenith, to.zenith, share),
    horizon: mix(from.horizon, to.horizon, share),
    ground: mix(from.ground, to.ground, share),
    glow: mix(from.glow, to.glow, share),
    sun: mix(from.sun, to.sun, share),
    strength: from.strength + (to.strength - from.strength) * share,
  };
}

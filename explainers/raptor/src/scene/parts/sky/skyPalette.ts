import { Color } from 'three';
import { clamp, smoothstep } from '@core/math';
import { SKY } from '../../constants';

export interface SkyPalette {
  zenith: Color;
  horizon: Color;
  ground: Color;
  glow: Color;
  limb: Color;
  dip: number;
  haze: number;
  stars: number;
  lights: number;
  shore: number;
}

type Stop = readonly [altitudeKm: number, colour: string];

const EARTH_RADIUS_KM = 6371;

export function colourAt(stops: readonly Stop[], altitudeKm: number, target: Color): Color {
  if (altitudeKm <= stops[0][0]) return target.set(stops[0][1]);
  for (let index = 1; index < stops.length; index += 1) {
    const [end, colour] = stops[index];
    if (altitudeKm <= end) {
      const [start, from] = stops[index - 1];
      return target.set(from).lerp(new Color(colour), (altitudeKm - start) / (end - start));
    }
  }
  return target.set(stops[stops.length - 1][1]);
}

export function horizonDip(altitudeKm: number): number {
  const height = Math.max(0, altitudeKm);
  return Math.sin(Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + height))) * SKY.dipExaggeration;
}

export function createSkyPalette(): SkyPalette {
  return {
    zenith: new Color(),
    horizon: new Color(),
    ground: new Color(),
    glow: new Color(),
    limb: new Color(),
    dip: 0,
    haze: 0,
    stars: 0,
    lights: 0,
    shore: 0,
  };
}

export function skyPalette(
  altitudeKm: number,
  target: SkyPalette = createSkyPalette(),
): SkyPalette {
  const height = clamp(altitudeKm, 0, SKY.topKm);
  colourAt(SKY.zenith, height, target.zenith);
  colourAt(SKY.horizon, height, target.horizon);
  colourAt(SKY.ground, height, target.ground);
  colourAt(SKY.glow, height, target.glow);
  colourAt(SKY.limb, height, target.limb);
  target.dip = horizonDip(height);
  target.haze = SKY.haze[0] + (SKY.haze[1] - SKY.haze[0]) * smoothstep(height, 0, SKY.hazeGoneKm);
  target.stars =
    SKY.duskStars + (1 - SKY.duskStars) * smoothstep(height, SKY.starsFrom, SKY.starsFull);
  target.lights = 1 - smoothstep(height, 0, SKY.lightsGoneKm);
  target.shore = 1 - smoothstep(height, SKY.shoreFadeKm[0], SKY.shoreFadeKm[1]);
  return target;
}

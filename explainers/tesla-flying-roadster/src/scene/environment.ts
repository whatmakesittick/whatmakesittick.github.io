import { CanvasTexture, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import { FULL_TURN } from '@core/math';
import type { ResourceTracker } from '@core/scene/resources';
import { THEME } from '../theme';
import { LIGHT_RIG } from './constants';

type Triple = readonly [number, number, number];

interface Stop {
  at: number;
  color: string;
}

const SIZE = { width: 512, height: 256 } as const;
const HORIZON_Y = SIZE.height / 2;
const SKY: readonly Stop[] = [
  { at: 0, color: THEME.skyZenith },
  { at: 0.55, color: THEME.skyMiddle },
  { at: 0.92, color: THEME.skyHorizon },
  { at: 1, color: '#ffc58c' },
];
const GROUND: readonly Stop[] = [
  { at: 0, color: '#b9b0a4' },
  { at: 0.08, color: THEME.concrete },
  { at: 0.2, color: '#5d5750' },
  { at: 0.34, color: THEME.scrub },
  { at: 1, color: '#16140f' },
];
const GLOW = { width: 0.42, height: 0.36, color: 'rgba(255, 170, 105, 0.75)' } as const;
const SUN = {
  radius: 26,
  core: 'rgba(255, 246, 228, 1)',
  halo: 'rgba(255, 196, 128, 0.85)',
  edge: 'rgba(255, 150, 90, 0)',
} as const;
const HALO_STOP = 0.25;
const WRAP = [-1, 0, 1] as const;

const cache = new WeakMap<ResourceTracker, Texture>();

export function equirectSpot(direction: Triple): readonly [x: number, y: number] {
  const [x, y, z] = direction;
  const length = Math.hypot(x, y, z);
  const u = Math.atan2(z, x) / FULL_TURN + 0.5;
  const v = Math.asin(y / length) / Math.PI + 0.5;
  return [u * SIZE.width, (1 - v) * SIZE.height];
}

function band(context: CanvasRenderingContext2D, from: number, to: number, stops: readonly Stop[]) {
  const gradient = context.createLinearGradient(0, from, 0, to);
  stops.forEach(({ at, color }) => gradient.addColorStop(at, color));
  context.fillStyle = gradient;
  context.fillRect(0, from, SIZE.width, to - from);
}

function glow(context: CanvasRenderingContext2D, x: number): void {
  const radius = GLOW.width * SIZE.width;
  const gradient = context.createRadialGradient(x, HORIZON_Y, 0, x, HORIZON_Y, radius);
  gradient.addColorStop(0, GLOW.color);
  gradient.addColorStop(1, 'rgba(255, 170, 105, 0)');
  context.save();
  context.translate(x, HORIZON_Y);
  context.scale(1, (GLOW.height * SIZE.height) / radius);
  context.translate(-x, -HORIZON_Y);
  context.fillStyle = gradient;
  context.fillRect(x - radius, HORIZON_Y - radius, 2 * radius, radius);
  context.restore();
}

function sun(context: CanvasRenderingContext2D, x: number, y: number): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, SUN.radius);
  gradient.addColorStop(0, SUN.core);
  gradient.addColorStop(HALO_STOP, SUN.halo);
  gradient.addColorStop(1, SUN.edge);
  context.fillStyle = gradient;
  context.fillRect(x - SUN.radius, y - SUN.radius, 2 * SUN.radius, 2 * SUN.radius);
}

function paintDusk(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  band(context, 0, HORIZON_Y, SKY);
  const [sunX, sunY] = equirectSpot(LIGHT_RIG.key.direction);
  WRAP.forEach((turn) => glow(context, sunX + turn * SIZE.width));
  WRAP.forEach((turn) => sun(context, sunX + turn * SIZE.width, sunY));
  band(context, HORIZON_Y, SIZE.height, GROUND);
}

export function duskEnvironment(tracker: ResourceTracker): Texture {
  const known = cache.get(tracker);
  if (known) return known;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE.width;
  canvas.height = SIZE.height;
  paintDusk(canvas);
  const texture = tracker.track(new CanvasTexture(canvas));
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  cache.set(tracker, texture);
  return texture;
}

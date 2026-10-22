import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';

const SIZE = 256;
const BASE = 236;
const SEED = 20031231;
const CONCRETE_COLOUR = '#aeb0ae';
const ANISOTROPY = 4;

type Range = readonly [from: number, spread: number];

const PAINT = {
  blotches: { count: 26, radius: [0.08, 0.22], tone: [-30, 50], alpha: 0.18 },
  streaks: { count: 40, length: [0.2, 0.6], tone: 150, alpha: [0.12, 0.1], width: [1, 2.5] },
  speckles: { count: 1400, tone: [-70, 90], alpha: 0.35 },
  panels: { count: 2, tone: 170, alpha: 0.35 },
} as const;

const RANDOM = { multiplier: 1103515245, increment: 12345, modulus: 2 ** 31 } as const;

type Random = () => number;

function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state * RANDOM.multiplier + RANDOM.increment) % RANDOM.modulus;
    return state / RANDOM.modulus;
  };
}

function within(random: Random, [from, spread]: Range): number {
  return from + random() * spread;
}

function grey(value: number, alpha: number): string {
  const level = Math.round(value);
  return `rgba(${level},${level},${level},${alpha})`;
}

function repeat(count: number, paint: () => void): void {
  for (let index = 0; index < count; index += 1) paint();
}

function paintBlotches(context: CanvasRenderingContext2D, random: Random): void {
  const { count, radius, tone, alpha } = PAINT.blotches;
  repeat(count, () => {
    const [x, y, reach] = [random() * SIZE, random() * SIZE, SIZE * within(random, radius)];
    const gradient = context.createRadialGradient(x, y, 0, x, y, reach);
    gradient.addColorStop(0, grey(BASE + within(random, tone), alpha));
    gradient.addColorStop(1, grey(BASE, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, SIZE, SIZE);
  });
}

function paintStreaks(context: CanvasRenderingContext2D, random: Random): void {
  const { count, length, tone, alpha, width } = PAINT.streaks;
  repeat(count, () => {
    const [x, reach] = [random() * SIZE, SIZE * within(random, length)];
    const gradient = context.createLinearGradient(0, 0, 0, reach);
    gradient.addColorStop(0, grey(tone, within(random, alpha)));
    gradient.addColorStop(1, grey(tone, 0));
    context.fillStyle = gradient;
    context.fillRect(x, 0, within(random, width), reach);
  });
}

function paintSpeckles(context: CanvasRenderingContext2D, random: Random): void {
  const { count, tone, alpha } = PAINT.speckles;
  repeat(count, () => {
    context.fillStyle = grey(BASE + within(random, tone), alpha);
    context.fillRect(random() * SIZE, random() * SIZE, 1, 1);
  });
}

function paintPanelLines(context: CanvasRenderingContext2D): void {
  const { count, tone, alpha } = PAINT.panels;
  context.fillStyle = grey(tone, alpha);
  for (let index = 0; index < count; index += 1) {
    context.fillRect((index * SIZE) / count, 0, 1, SIZE);
  }
}

function concreteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const random = seeded(SEED);
    context.fillStyle = grey(BASE, 1);
    context.fillRect(0, 0, SIZE, SIZE);
    paintBlotches(context, random);
    paintStreaks(context, random);
    paintSpeckles(context, random);
    paintPanelLines(context);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

export interface ConcreteLooks {
  readonly finish: MaterialFinish;
  readonly stations: Material;
}

export function concreteLooks(context: PartContext): ConcreteLooks {
  const map = context.tracker.track(concreteTexture());
  const finish: MaterialFinish = { ...FINISHES.concrete, color: CONCRETE_COLOUR, map };
  return { finish, stations: context.materials.get('stations', finish) };
}

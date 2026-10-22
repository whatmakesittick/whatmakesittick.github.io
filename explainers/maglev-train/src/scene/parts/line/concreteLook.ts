import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import { LINE_GROUP } from '../context';
import type { PartContext } from '../context';

const SIZE = 256;
const BASE = 236;
const SEED = 20031231;
const BLOTCHES = 26;
const STREAKS = 40;
const SPECKLES = 1400;
const PANEL_LINES = 2;
const CONCRETE_COLOUR = '#b2b0a9';

const RANDOM = { multiplier: 1103515245, increment: 12345, modulus: 2 ** 31 } as const;

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * RANDOM.multiplier + RANDOM.increment) % RANDOM.modulus;
    return state / RANDOM.modulus;
  };
}

function grey(value: number, alpha: number): string {
  const level = Math.round(value);
  return `rgba(${level},${level},${level},${alpha})`;
}

function paintBlotches(context: CanvasRenderingContext2D, random: () => number): void {
  for (let index = 0; index < BLOTCHES; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, SIZE * (0.08 + random() * 0.22)];
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, grey(BASE - 30 + random() * 50, 0.18));
    gradient.addColorStop(1, grey(BASE, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, SIZE, SIZE);
  }
}

function paintStreaks(context: CanvasRenderingContext2D, random: () => number): void {
  for (let index = 0; index < STREAKS; index += 1) {
    const [x, length] = [random() * SIZE, SIZE * (0.2 + random() * 0.6)];
    const gradient = context.createLinearGradient(0, 0, 0, length);
    gradient.addColorStop(0, grey(150, 0.12 + random() * 0.1));
    gradient.addColorStop(1, grey(150, 0));
    context.fillStyle = gradient;
    context.fillRect(x, 0, 1 + random() * 2.5, length);
  }
}

function paintSpeckles(context: CanvasRenderingContext2D, random: () => number): void {
  for (let index = 0; index < SPECKLES; index += 1) {
    context.fillStyle = grey(BASE - 70 + random() * 90, 0.35);
    context.fillRect(random() * SIZE, random() * SIZE, 1, 1);
  }
}

function paintPanelLines(context: CanvasRenderingContext2D): void {
  context.fillStyle = grey(170, 0.35);
  for (let index = 0; index < PANEL_LINES; index += 1) {
    context.fillRect((index * SIZE) / PANEL_LINES, 0, 1, SIZE);
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
  texture.anisotropy = 4;
  return texture;
}

export interface ConcreteLooks {
  readonly line: Material;
  readonly stations: Material;
}

export function concreteLooks(context: PartContext): ConcreteLooks {
  const map = context.tracker.track(concreteTexture());
  const finish: MaterialFinish = { ...FINISHES.concrete, color: CONCRETE_COLOUR, map };
  return {
    line: context.materials.get(LINE_GROUP, finish),
    stations: context.materials.get('stations', finish),
  };
}

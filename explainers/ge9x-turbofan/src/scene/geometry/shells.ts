import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { BufferGeometry } from 'three';
import { closedLoop, line, revolve, smooth } from './revolve';
import type { ProfilePoint, Strand } from './revolve';
import { reversed, sampled } from './profiles';
import type { RadiusAt } from './profiles';

const SHELL_SAMPLES = 12;

export function offsetCurve(at: RadiusAt, offset: number): RadiusAt {
  return (x: number) => at(x) + offset;
}

export function shellStrands(
  inner: RadiusAt,
  outer: RadiusAt,
  from: number,
  to: number,
  samples = SHELL_SAMPLES,
): Strand[] {
  const top = sampled(outer, from, to, samples);
  const bottom = reversed(sampled(inner, from, to, samples));
  return [
    top,
    line(top[top.length - 1], bottom[0]),
    bottom,
    line(bottom[bottom.length - 1], top[0]),
  ];
}

export function shell(
  inner: RadiusAt,
  outer: RadiusAt,
  from: number,
  to: number,
  segments: number,
  samples = SHELL_SAMPLES,
): BufferGeometry {
  return revolve(shellStrands(inner, outer, from, to, samples), segments);
}

export interface DiscSpec {
  readonly x: number;
  readonly width: number;
  readonly rim: number;
  readonly bore: number;
  readonly rimHeight: number;
  readonly web: number;
  readonly boreWidth: number;
  readonly boreHeight: number;
}

export function discLoop(disc: DiscSpec): Strand[] {
  const half = disc.width / 2;
  const webHalf = disc.web / 2;
  const boreHalf = disc.boreWidth / 2;
  const rimBase = disc.rim - disc.rimHeight;
  const boreTop = disc.bore + disc.boreHeight;
  const { x } = disc;
  const corners: ProfilePoint[] = [
    [x - half, disc.rim],
    [x + half, disc.rim],
    [x + half, rimBase],
    [x + webHalf, rimBase - disc.rimHeight * 0.5],
    [x + webHalf, boreTop + disc.boreHeight * 0.4],
    [x + boreHalf, boreTop],
    [x + boreHalf, disc.bore],
    [x - boreHalf, disc.bore],
    [x - boreHalf, boreTop],
    [x - webHalf, boreTop + disc.boreHeight * 0.4],
    [x - webHalf, rimBase - disc.rimHeight * 0.5],
    [x - half, rimBase],
  ];
  return closedLoop(corners);
}

export function smoothLoop(
  outerPath: readonly ProfilePoint[],
  innerPath: readonly ProfilePoint[],
  samples: number,
): Strand[] {
  const top = smooth(outerPath, samples);
  const bottom = reversed(smooth(innerPath, samples));
  return [
    top,
    line(top[top.length - 1], bottom[0]),
    bottom,
    line(bottom[bottom.length - 1], top[0]),
  ];
}

const STRIPE_WIDTH = 64;
const STRIPE_HEIGHT = 2;
const STRIPE_SHARE = 0.45;

export function stripeTexture(count: number, light: string, dark: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = STRIPE_WIDTH;
  canvas.height = STRIPE_HEIGHT;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = dark;
    context.fillRect(0, 0, STRIPE_WIDTH, STRIPE_HEIGHT);
    context.fillStyle = light;
    context.fillRect(0, 0, STRIPE_WIDTH * STRIPE_SHARE, STRIPE_HEIGHT);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.repeat.set(count, 1);
  return texture;
}

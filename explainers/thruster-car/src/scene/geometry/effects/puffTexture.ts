import { CanvasTexture, SRGBColorSpace } from 'three';
import { FULL_TURN } from '@core/math';
import { between, seededRandom } from './random';
import type { Random } from './random';

const PUFF = {
  size: 64,
  seed: 23,
  core: { radius: 0.36, alpha: 0.5 },
  lumps: { count: 7, radius: [0.13, 0.24], reach: 0.5, alpha: [0.22, 0.4] },
  shoulder: { offset: 0.45, share: 0.5 },
} as const;

function blob(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(PUFF.shoulder.offset, `rgba(255,255,255,${alpha * PUFF.shoulder.share})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, PUFF.size, PUFF.size);
}

function lump(context: CanvasRenderingContext2D, random: Random): void {
  const { radius, reach, alpha } = PUFF.lumps;
  const half = PUFF.size / 2;
  const size = between(random, radius[0], radius[1]);
  const distance = (reach - size) * Math.sqrt(random());
  const angle = random() * FULL_TURN;
  blob(
    context,
    half + Math.cos(angle) * distance * PUFF.size,
    half + Math.sin(angle) * distance * PUFF.size,
    size * PUFF.size,
    between(random, alpha[0], alpha[1]),
  );
}

function paintPuff(context: CanvasRenderingContext2D): void {
  const half = PUFF.size / 2;
  const random = seededRandom(PUFF.seed);
  blob(context, half, half, PUFF.core.radius * PUFF.size, PUFF.core.alpha);
  for (let index = 0; index < PUFF.lumps.count; index++) lump(context, random);
}

export function puffTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = PUFF.size;
  canvas.height = PUFF.size;
  const context = canvas.getContext('2d');
  if (context) paintPuff(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const SIZE = 256;
const STONES = 900;
const STONE_RADIUS = { min: 3, max: 9 };
const TONES = ['#77746d', '#8f8b83', '#a29e95', '#69665f', '#b3aea4', '#5d5a54'];
const BASE = '#6e6b65';
const SHADE = 'rgba(0, 0, 0, 0.22)';
const SEED = 7;
const MODULUS = 2147483647;
const MULTIPLIER = 48271;

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return state / MODULUS;
  };
}

function drawStones(context: CanvasRenderingContext2D): void {
  const next = random(SEED);
  context.fillStyle = BASE;
  context.fillRect(0, 0, SIZE, SIZE);
  for (let index = 0; index < STONES; index += 1) {
    const x = next() * SIZE;
    const y = next() * SIZE;
    const radius = STONE_RADIUS.min + next() * (STONE_RADIUS.max - STONE_RADIUS.min);
    const tone = TONES[Math.floor(next() * TONES.length)];
    context.beginPath();
    context.ellipse(x + 1, y + 1.5, radius, radius * 0.75, next() * Math.PI, 0, Math.PI * 2);
    context.fillStyle = SHADE;
    context.fill();
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.75, next() * Math.PI, 0, Math.PI * 2);
    context.fillStyle = tone;
    context.fill();
  }
}

export function ballastTexture(tileMetres: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (context) drawStones(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / tileMetres, 1 / tileMetres);
  return texture;
}

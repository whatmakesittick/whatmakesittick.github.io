import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import { WAVE_PHASE_COLOURS } from '../../../theme';
import { INK } from './constants';

type Paint = (context: CanvasRenderingContext2D, width: number, height: number) => void;

const HATCH = { size: 64, line: 5, base: '#c9c9c9', ink: '#ffffff' } as const;
const FIELD = {
  width: 384,
  height: 64,
  blend: 0.035,
  faceRows: 5,
  topAlpha: 0.14,
  faceAlpha: 0.62,
} as const;
const POLES = {
  width: 1024,
  height: 160,
  faceShare: 0.62,
  coilTopShare: 0.32,
  letterShare: 0.5,
  corner: 18,
} as const;
const BODY = {
  width: 512,
  height: 128,
  coreShare: 0.4,
  turnRows: 8,
  divider: 6,
  lamination: 9,
} as const;
const FADE = { width: 4, height: 64 } as const;
const POLE_COUNT = 2;
const LETTERS = ['N', 'S'] as const;
const FONT = "800 {size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SHEEN = 0.18;

function canvasTexture(width: number, height: number, paint: Paint, wrapT = false): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  if (wrapT) texture.wrapT = RepeatWrapping;
  return texture;
}

function mix(from: string, to: string, share: number): string {
  return `#${new Color(from).lerp(new Color(to), share).getHexString()}`;
}

function lighter(colour: string, share = SHEEN): string {
  return mix(colour, '#ffffff', share);
}

const paintHatch: Paint = (context, size) => {
  context.fillStyle = HATCH.base;
  context.fillRect(0, 0, size, size);
  context.strokeStyle = HATCH.ink;
  context.lineWidth = HATCH.line;
  [-size, 0, size].forEach((shift) => {
    context.beginPath();
    context.moveTo(shift, size);
    context.lineTo(shift + size, 0);
    context.stroke();
  });
};

function fieldGradient(context: CanvasRenderingContext2D, width: number): CanvasGradient {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  const [a, b, c] = WAVE_PHASE_COLOURS;
  const seam = mix(c, a, 0.5);
  const third = 1 / 3;
  gradient.addColorStop(0, seam);
  [a, b, c].forEach((colour, index) => {
    gradient.addColorStop(index * third + FIELD.blend, colour);
    gradient.addColorStop((index + 1) * third - FIELD.blend, colour);
  });
  gradient.addColorStop(1, seam);
  return gradient;
}

const paintField: Paint = (context, width, height) => {
  const colours = fieldGradient(context, width);
  context.fillStyle = colours;
  context.fillRect(0, 0, width, height);
  const fade = context.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, `rgba(0,0,0,${FIELD.topAlpha})`);
  fade.addColorStop(1, `rgba(0,0,0,${FIELD.faceAlpha})`);
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = fade;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = colours;
  context.fillRect(0, height - FIELD.faceRows, width, FIELD.faceRows);
};

function paintPole(
  context: CanvasRenderingContext2D,
  index: number,
  width: number,
  height: number,
): void {
  const pitch = width / POLE_COUNT;
  const face = pitch * POLES.faceShare;
  const left = index * pitch + (pitch - face) / 2;
  const colour = index === 0 ? INK.north : INK.south;
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, lighter(colour));
  shade.addColorStop(1, colour);
  context.fillStyle = shade;
  context.beginPath();
  context.roundRect(left, 0, face, height, [POLES.corner, POLES.corner, 0, 0]);
  context.fill();
  context.fillStyle = INK.poleLetter;
  context.font = FONT.replace('{size}', String(Math.round(height * POLES.letterShare)));
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(LETTERS[index], left + face / 2, height / 2);
}

const paintPoles: Paint = (context, width, height) => {
  context.fillStyle = INK.coil;
  context.fillRect(0, height * POLES.coilTopShare, width, height);
  Array.from({ length: POLE_COUNT }, (_, index) => paintPole(context, index, width, height));
};

function paintCoilTurns(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = INK.coilTurn;
  const step = height / BODY.turnRows;
  Array.from({ length: BODY.turnRows }, (_, row) => context.fillRect(0, row * step, width, 1));
}

function paintCores(context: CanvasRenderingContext2D, width: number, height: number): void {
  const pitch = width / POLE_COUNT;
  const core = pitch * BODY.coreShare;
  Array.from({ length: POLE_COUNT }, (_, index) => {
    const left = index * pitch + (pitch - core) / 2;
    context.fillStyle = INK.core;
    context.fillRect(left, 0, core, height);
    context.fillStyle = lighter(INK.core);
    for (let x = left + BODY.lamination / 2; x < left + core; x += BODY.lamination) {
      context.fillRect(x, 0, 1, height);
    }
  });
  context.fillStyle = INK.sheath;
  [0, pitch, width].forEach((x) => context.fillRect(x - BODY.divider / 2, 0, BODY.divider, height));
}

const paintBody: Paint = (context, width, height) => {
  context.fillStyle = INK.coil;
  context.fillRect(0, 0, width, height);
  paintCoilTurns(context, width, height);
  paintCores(context, width, height);
};

const paintFade: Paint = (context, width, height) => {
  const fade = context.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, 'rgba(255,255,255,1)');
  context.fillStyle = fade;
  context.fillRect(0, 0, width, height);
};

export function fadeTexture(): CanvasTexture {
  return canvasTexture(FADE.width, FADE.height, paintFade);
}

export function hatchTexture(): CanvasTexture {
  return canvasTexture(HATCH.size, HATCH.size, paintHatch, true);
}

export function fieldTexture(): CanvasTexture {
  return canvasTexture(FIELD.width, FIELD.height, paintField);
}

export function poleTexture(): CanvasTexture {
  return canvasTexture(POLES.width, POLES.height, paintPoles);
}

export function magnetBodyTexture(): CanvasTexture {
  return canvasTexture(BODY.width, BODY.height, paintBody, true);
}

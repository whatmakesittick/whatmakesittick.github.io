import { Color, RepeatWrapping } from 'three';
import type { CanvasTexture } from 'three';
import { WAVE_PHASE_COLOURS } from '../../../theme';
import { canvasTexture } from '../canvasTexture';
import type { CanvasPaint } from '../canvasTexture';
import { INK } from './constants';
import { FONT_FAMILY } from './textPlate';

const HATCH = { size: 64, line: 5, base: '#c9c9c9', ink: '#ffffff' } as const;
const FIELD = {
  width: 384,
  height: 64,
  blend: 0.035,
  faceRows: 5,
  topAlpha: 0.14,
  faceAlpha: 0.62,
  spillAlpha: 0.42,
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
const POLE_INKS = [INK.north, INK.south] as const;
const LETTER_WEIGHT = 800;
const SHEEN = 0.18;

const TILED = { wrapT: RepeatWrapping } as const;

function mix(from: string, to: string, share: number): string {
  return `#${new Color(from).lerp(new Color(to), share).getHexString()}`;
}

function lighter(colour: string): string {
  return mix(colour, '#ffffff', SHEEN);
}

const paintHatch: CanvasPaint = (context, size) => {
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

function verticalGradient(
  context: CanvasRenderingContext2D,
  height: number,
  top: string,
  bottom: string,
): CanvasGradient {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

function fillFade(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  [top, bottom]: readonly [number, number],
): void {
  const alpha = (value: number) => `rgba(255,255,255,${value})`;
  context.fillStyle = verticalGradient(context, height, alpha(top), alpha(bottom));
  context.fillRect(0, 0, width, height);
}

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

function paintFadedField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alphas: readonly [number, number],
): CanvasGradient {
  const colours = fieldGradient(context, width);
  context.fillStyle = colours;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'destination-in';
  fillFade(context, width, height, alphas);
  context.globalCompositeOperation = 'source-over';
  return colours;
}

const paintField: CanvasPaint = (context, width, height) => {
  context.fillStyle = paintFadedField(context, width, height, [FIELD.topAlpha, FIELD.faceAlpha]);
  context.fillRect(0, height - FIELD.faceRows, width, FIELD.faceRows);
};

const paintSpill: CanvasPaint = (context, width, height) => {
  paintFadedField(context, width, height, [FIELD.spillAlpha, 0]);
};

type PoleDraw = (left: number, size: number, index: number) => void;

function eachPole(width: number, share: number, draw: PoleDraw): void {
  const pitch = width / POLE_COUNT;
  const size = pitch * share;
  Array.from({ length: POLE_COUNT }, (_, index) =>
    draw(index * pitch + (pitch - size) / 2, size, index),
  );
}

const paintPoles: CanvasPaint = (context, width, height) => {
  context.fillStyle = INK.coil;
  context.fillRect(0, height * POLES.coilTopShare, width, height);
  context.font = `${LETTER_WEIGHT} ${Math.round(height * POLES.letterShare)}px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  eachPole(width, POLES.faceShare, (left, face, index) => {
    const colour = POLE_INKS[index];
    context.fillStyle = verticalGradient(context, height, lighter(colour), colour);
    context.beginPath();
    context.roundRect(left, 0, face, height, [POLES.corner, POLES.corner, 0, 0]);
    context.fill();
    context.fillStyle = INK.poleLetter;
    context.fillText(LETTERS[index], left + face / 2, height / 2);
  });
};

function paintCoilTurns(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = INK.coilTurn;
  const step = height / BODY.turnRows;
  Array.from({ length: BODY.turnRows }, (_, row) => context.fillRect(0, row * step, width, 1));
}

function paintCores(context: CanvasRenderingContext2D, width: number, height: number): void {
  eachPole(width, BODY.coreShare, (left, core) => {
    context.fillStyle = INK.core;
    context.fillRect(left, 0, core, height);
    context.fillStyle = lighter(INK.core);
    for (let x = left + BODY.lamination / 2; x < left + core; x += BODY.lamination) {
      context.fillRect(x, 0, 1, height);
    }
  });
  context.fillStyle = INK.sheath;
  const dividers = [0, width / POLE_COUNT, width];
  dividers.forEach((x) => context.fillRect(x - BODY.divider / 2, 0, BODY.divider, height));
}

const paintBody: CanvasPaint = (context, width, height) => {
  context.fillStyle = INK.coil;
  context.fillRect(0, 0, width, height);
  paintCoilTurns(context, width, height);
  paintCores(context, width, height);
};

const paintFade: CanvasPaint = (context, width, height) => fillFade(context, width, height, [0, 1]);

export function fadeTexture(): CanvasTexture {
  return canvasTexture(FADE.width, FADE.height, paintFade);
}

export function hatchTexture(): CanvasTexture {
  return canvasTexture(HATCH.size, HATCH.size, paintHatch, TILED);
}

export function fieldSpillTexture(): CanvasTexture {
  return canvasTexture(FIELD.width, FIELD.height, paintSpill);
}

export function fieldTexture(): CanvasTexture {
  return canvasTexture(FIELD.width, FIELD.height, paintField);
}

export function poleTexture(): CanvasTexture {
  return canvasTexture(POLES.width, POLES.height, paintPoles);
}

export function magnetBodyTexture(): CanvasTexture {
  return canvasTexture(BODY.width, BODY.height, paintBody, TILED);
}

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { PAINT } from '../../finishes';
import { ROOM_DETAIL } from '../../constants';

type Paint = (context: CanvasRenderingContext2D, size: number) => void;

const ANISOTROPY = 8;
const WALL_SHEET_TILE = 2.4;
const SEAM_ALPHA = 0.18;
const GROUT = 2;
const SHEET_COLUMNS = 2;
const SHEET_TONE_SPREAD = 0.12;
const SHEET_SEAM_DARK = 'rgba(16, 9, 5, 0.6)';
const SHEET_SEAM_LIGHT = 'rgba(255, 214, 180, 0.08)';
const BRUSH_STROKES = 120;
const BRUSH_ALPHA = 0.014;
const SHEET_SHEEN = 'rgba(255, 196, 150, 0.1)';
const SCREW_STEP = 6;
const SCREW_RADIUS = 1;
const SCREW_INSET = 4;
const SCREW_FILL = 'rgba(20, 12, 8, 0.35)';
const SHEEN_BANDS = [
  { at: 0.3, width: 0.16, alpha: 0.55 },
  { at: 0.52, width: 0.05, alpha: 0.35 },
] as const;
const SHEEN_SLANT = 0.45;
const SPECKLES = 900;
const SPECKLE_ALPHA = 0.06;
const DISPLAY_ROWS = 6;
const TRACE_POINTS = 48;
const TRACE_SWING = 0.3;
const TRACE_TURNS = 5;

function canvasTexture(paint: Paint, repeat: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ROOM_DETAIL.textureSize;
  canvas.height = ROOM_DETAIL.textureSize;
  const context = canvas.getContext('2d');
  if (context) paint(context, ROOM_DETAIL.textureSize);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function brushStreaks(context: CanvasRenderingContext2D, size: number): void {
  const random = seededRandom(11);
  for (let index = 0; index < BRUSH_STROKES; index += 1) {
    const shade = random() > 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${BRUSH_ALPHA})`;
    context.fillRect(random() * size, 0, 1, size);
  }
}

function screwRow(context: CanvasRenderingContext2D, x: number, y: number, length: number): void {
  context.fillStyle = SCREW_FILL;
  const step = length / SCREW_STEP;
  for (let index = 0; index < SCREW_STEP; index += 1) {
    context.beginPath();
    context.arc(x + (index + 0.5) * step, y, SCREW_RADIUS, 0, Math.PI * 2);
    context.fill();
  }
}

function seam(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  context.fillStyle = SHEET_SEAM_DARK;
  context.fillRect(x, y, w, h);
  context.fillStyle = SHEET_SEAM_LIGHT;
  context.fillRect(x + (h > w ? 1 : 0), y + (w > h ? 1 : 0), w, h);
}

function sheetSheen(context: CanvasRenderingContext2D, x: number, column: number, size: number) {
  const gradient = context.createLinearGradient(x, 0, x + column, size);
  gradient.addColorStop(0, SHEET_SHEEN);
  gradient.addColorStop(1, 'rgba(255, 196, 150, 0)');
  context.fillStyle = gradient;
  context.fillRect(x, 0, column, size);
}

function copperSheets(context: CanvasRenderingContext2D, size: number): void {
  const column = size / SHEET_COLUMNS;
  const random = seededRandom(3);
  context.fillStyle = PAINT.copperSheet;
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < SHEET_COLUMNS; index += 1) {
    const tone = (random() - 0.5) * SHEET_TONE_SPREAD;
    context.fillStyle = tone > 0 ? `rgba(255, 220, 190, ${tone})` : `rgba(0, 0, 0, ${-tone})`;
    context.fillRect(index * column, 0, column, size);
  }
  brushStreaks(context, size);
  for (let index = 0; index < SHEET_COLUMNS; index += 1) {
    const x = index * column;
    sheetSheen(context, x, column, size);
    const y = (index * size) / SHEET_COLUMNS;
    seam(context, x, 0, 1, size);
    seam(context, x, y, column, 1);
    screwRow(context, x, y + SCREW_INSET, column);
  }
}

function glassSheen(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = '#000000';
  context.fillRect(0, 0, size, size);
  SHEEN_BANDS.forEach(({ at, width, alpha }) => {
    const gradient = context.createLinearGradient(0, 0, size, size * SHEEN_SLANT);
    gradient.addColorStop(Math.max(0, at - width), 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(at, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(Math.min(1, at + width), 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

function vinylTile(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = PAINT.vinyl;
  context.fillRect(0, 0, size, size);
  const random = seededRandom(7);
  for (let index = 0; index < SPECKLES; index += 1) {
    const shade = random() > 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${SPECKLE_ALPHA})`;
    context.fillRect(random() * size, random() * size, 2, 2);
  }
  context.strokeStyle = `rgba(90, 84, 74, ${SEAM_ALPHA})`;
  context.lineWidth = GROUT;
  context.strokeRect(0, 0, size, size);
}

function consoleDisplay(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = '#081420';
  context.fillRect(0, 0, size, size);
  const row = size / DISPLAY_ROWS;
  context.fillStyle = PAINT.consoleGlow;
  for (let index = 1; index < DISPLAY_ROWS; index += 2) {
    context.fillRect(row / 2, index * row, size / 2, row / 4);
  }
  context.strokeStyle = '#7fc4ff';
  context.lineWidth = GROUT;
  context.beginPath();
  for (let index = 0; index <= TRACE_POINTS; index += 1) {
    const t = index / TRACE_POINTS;
    const y = size * (0.5 + TRACE_SWING * Math.sin(t * Math.PI * TRACE_TURNS) * Math.exp(-2 * t));
    if (index === 0) context.moveTo(size * 0.55, y);
    else context.lineTo(size * (0.55 + 0.4 * t), y);
  }
  context.stroke();
}

export function wallTexture(): CanvasTexture {
  return canvasTexture(copperSheets, 1 / WALL_SHEET_TILE);
}

export function floorTexture(): CanvasTexture {
  return canvasTexture(vinylTile, 1 / ROOM_DETAIL.floorTile);
}

export function glassSheenTexture(): CanvasTexture {
  return canvasTexture(glassSheen, 1);
}

export function displayTexture(): CanvasTexture {
  return canvasTexture(consoleDisplay, 1);
}

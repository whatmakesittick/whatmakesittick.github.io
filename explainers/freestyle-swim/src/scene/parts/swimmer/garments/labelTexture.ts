import { CanvasTexture, SRGBColorSpace } from 'three';
import { LABEL_ASPECT } from './label';

export const LABEL_TEXT = 'wmit';

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH * LABEL_ASPECT);
const FILL = 0.96;
const REFERENCE_SIZE = 100;
const FONT_WEIGHT = 700;
const FONT_VARIABLE = '--font-sans';
const FONT_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INK = '#ffffff';

function fontFamily(): string {
  const declared = getComputedStyle(document.documentElement).getPropertyValue(FONT_VARIABLE);
  return declared.trim() || FONT_FALLBACK;
}

function fontAt(size: number, family: string): string {
  return `${FONT_WEIGHT} ${size}px ${family}`;
}

function drawLabel(context: CanvasRenderingContext2D, family: string): void {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.font = fontAt(REFERENCE_SIZE, family);
  const metrics = context.measureText(LABEL_TEXT);
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const scale = Math.min((CANVAS_WIDTH * FILL) / width, (CANVAS_HEIGHT * FILL) / height);
  context.font = fontAt(REFERENCE_SIZE * scale, family);
  context.fillStyle = INK;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const x = (CANVAS_WIDTH - width * scale) / 2 + metrics.actualBoundingBoxLeft * scale;
  const y = (CANVAS_HEIGHT - height * scale) / 2 + metrics.actualBoundingBoxAscent * scale;
  context.fillText(LABEL_TEXT, x, y);
}

export function labelTexture(): CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const family = fontFamily();
  drawLabel(context, family);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  document.fonts
    ?.load(fontAt(REFERENCE_SIZE, family), LABEL_TEXT)
    .then(() => {
      drawLabel(context, family);
      texture.needsUpdate = true;
    })
    .catch(() => undefined);
  return texture;
}

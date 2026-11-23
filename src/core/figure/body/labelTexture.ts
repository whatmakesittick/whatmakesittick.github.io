import { CanvasTexture, SRGBColorSpace } from 'three';

export interface LabelTextureOptions {
  readonly text: string;
  readonly aspect: number;
}

const CANVAS_WIDTH = 1024;
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

function drawLabel(
  context: CanvasRenderingContext2D,
  family: string,
  text: string,
  canvasHeight: number,
): void {
  context.clearRect(0, 0, CANVAS_WIDTH, canvasHeight);
  context.font = fontAt(REFERENCE_SIZE, family);
  const metrics = context.measureText(text);
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const scale = Math.min((CANVAS_WIDTH * FILL) / width, (canvasHeight * FILL) / height);
  context.font = fontAt(REFERENCE_SIZE * scale, family);
  context.fillStyle = INK;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const x = (CANVAS_WIDTH - width * scale) / 2 + metrics.actualBoundingBoxLeft * scale;
  const y = (canvasHeight - height * scale) / 2 + metrics.actualBoundingBoxAscent * scale;
  context.fillText(text, x, y);
}

export function labelTexture({ text, aspect }: LabelTextureOptions): CanvasTexture | undefined {
  const canvasHeight = Math.round(CANVAS_WIDTH * aspect);
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const family = fontFamily();
  drawLabel(context, family, text, canvasHeight);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  document.fonts
    ?.load(fontAt(REFERENCE_SIZE, family), text)
    .then(() => {
      drawLabel(context, family, text, canvasHeight);
      texture.needsUpdate = true;
    })
    .catch(() => undefined);
  return texture;
}

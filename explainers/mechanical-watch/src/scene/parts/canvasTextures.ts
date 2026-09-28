import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { toRadians } from '@core/math';
import { DIAL_FACE } from '../constants';
import { PAINT } from '../finishes';
import { WHEEL_CENTRES } from '../../model/layout';
import { DIAL_RADIUS_MM } from '../../model/scale';

type Painter = (context: CanvasRenderingContext2D, size: number) => void;

const ANISOTROPY = 8;
const FULL_CIRCLE = Math.PI * 2;
const CHANNEL_MAX = 255;

const STRIPES = { size: 256, arcs: 90, arcAlpha: 0.06, low: 0.8, high: 1, curve: 1.6 } as const;
const PERLAGE = { size: 512, cells: 4, spokes: 3, low: 0.87, high: 1, rim: 0.04 } as const;
const GRAINING = { size: 512, rings: 150, low: 0.8, high: 1, jitter: 0.12 } as const;
const SUNBURST = { size: 512, rays: 360, low: 0.78, high: 1 } as const;

const DIAL_PAINT = {
  edge: '#e4dfd4',
  centre: '#f8f6f1',
  track: { outer: 13.05, minute: 12.55, five: 12.2, line: 0.045, fiveLine: 0.1 },
  subDial: { rings: 34, ringAlpha: 0.1, tick: 0.34, fiveTick: 0.62, line: 0.035, fiveLine: 0.07 },
  subDialNumbers: { radius: 2.28, size: 0.62 },
  wordmark: { y: 5.6, size: 0.72, text: 'hand wound' },
  font: '"Georgia", "Times New Roman", serif',
  subFont: '"Helvetica Neue", Arial, sans-serif',
} as const;

const SECONDS_PER_MINUTE = 60;
const TICK_EVERY = 5;
const SUB_DIAL_NUMBERS = [10, 20, 30, 40, 50, 60];
const DEGREES_PER_SECOND = 6;

function grey(value: number, alpha = 1): string {
  const level = Math.round(Math.min(1, Math.max(0, value)) * CHANNEL_MAX);
  return `rgba(${level}, ${level}, ${level}, ${alpha})`;
}

function canvasTexture(size: number, paint: Painter): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) paint(context, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

function repeating(texture: CanvasTexture): CanvasTexture {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

function paintStripes(context: CanvasRenderingContext2D, size: number): void {
  for (let x = 0; x < size; x += 1) {
    const across = Math.abs((2 * x) / size - 1);
    const shade = STRIPES.low + (STRIPES.high - STRIPES.low) * (1 - across ** STRIPES.curve);
    context.fillStyle = grey(shade);
    context.fillRect(x, 0, 1, size);
  }
  context.lineWidth = 1;
  for (let arc = 0; arc < STRIPES.arcs; arc += 1) {
    const y = (arc / STRIPES.arcs) * size * 2 - size / 2;
    context.strokeStyle = grey(arc % 2 === 0 ? 1 : 0.55, STRIPES.arcAlpha);
    context.beginPath();
    context.arc(size / 2, y + size * 1.5, size * 1.5, Math.PI * 1.3, Math.PI * 1.7);
    context.stroke();
  }
}

export function genevaStripes(): CanvasTexture {
  return repeating(canvasTexture(STRIPES.size, paintStripes));
}

function perlageSpot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  const gradient = context.createConicGradient(0, x, y);
  const stops = PERLAGE.spokes * 2;
  for (let stop = 0; stop <= stops; stop += 1) {
    gradient.addColorStop(stop / stops, grey(stop % 2 === 0 ? PERLAGE.high : PERLAGE.low));
  }
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, FULL_CIRCLE);
  context.fill();
  context.strokeStyle = grey(PERLAGE.low, 0.6);
  context.lineWidth = radius * PERLAGE.rim;
  context.stroke();
}

function paintPerlage(context: CanvasRenderingContext2D, size: number): void {
  const cell = size / PERLAGE.cells;
  context.fillStyle = grey(PERLAGE.high);
  context.fillRect(0, 0, size, size);
  for (let row = -1; row <= PERLAGE.cells; row += 1) {
    for (let column = -1; column <= PERLAGE.cells; column += 1) {
      const shift = row % 2 === 0 ? 0 : cell / 2;
      perlageSpot(context, column * cell + shift, row * cell, cell * 0.72);
    }
  }
}

export function perlage(): CanvasTexture {
  return repeating(canvasTexture(PERLAGE.size, paintPerlage));
}

function paintGraining(context: CanvasRenderingContext2D, size: number): void {
  const centre = size / 2;
  context.fillStyle = grey(GRAINING.high);
  context.fillRect(0, 0, size, size);
  context.lineWidth = centre / GRAINING.rings;
  for (let ring = 0; ring < GRAINING.rings; ring += 1) {
    const wave = 0.5 + 0.5 * Math.sin(ring * 1.7) * Math.cos(ring * 0.37);
    const shade = GRAINING.low + (GRAINING.high - GRAINING.low) * wave;
    context.strokeStyle = grey(shade + (Math.sin(ring * 12.9898) * GRAINING.jitter) / 2);
    context.beginPath();
    context.arc(centre, centre, (ring + 0.5) * context.lineWidth, 0, FULL_CIRCLE);
    context.stroke();
  }
}

export function circularGraining(): CanvasTexture {
  return canvasTexture(GRAINING.size, paintGraining);
}

function paintSunburst(context: CanvasRenderingContext2D, size: number): void {
  const centre = size / 2;
  const gradient = context.createConicGradient(0, centre, centre);
  for (let ray = 0; ray <= SUNBURST.rays; ray += 1) {
    const wave = 0.5 + 0.5 * Math.sin(ray * 0.9) * Math.sin(ray * 0.13);
    gradient.addColorStop(
      ray / SUNBURST.rays,
      grey(SUNBURST.low + (SUNBURST.high - SUNBURST.low) * wave),
    );
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
}

export function sunburst(): CanvasTexture {
  return canvasTexture(SUNBURST.size, paintSunburst);
}

interface DialFrame {
  context: CanvasRenderingContext2D;
  scale: number;
  centre: number;
}

function toCanvas(frame: DialFrame, x: number, y: number): [number, number] {
  return [frame.centre - x * frame.scale, frame.centre - y * frame.scale];
}

function radialLine(
  frame: DialFrame,
  cx: number,
  cy: number,
  angle: number,
  from: number,
  to: number,
): void {
  const along = (radius: number) =>
    toCanvas(frame, cx - Math.sin(angle) * radius, cy + Math.cos(angle) * radius);
  const [x0, y0] = along(from);
  const [x1, y1] = along(to);
  frame.context.beginPath();
  frame.context.moveTo(x0, y0);
  frame.context.lineTo(x1, y1);
  frame.context.stroke();
}

function paintDialBase(frame: DialFrame, size: number): void {
  const { context, centre } = frame;
  const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, centre);
  gradient.addColorStop(0, DIAL_PAINT.centre);
  gradient.addColorStop(1, DIAL_PAINT.edge);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
}

function paintMinuteTrack(frame: DialFrame): void {
  const { context, scale } = frame;
  const { track } = DIAL_PAINT;
  context.strokeStyle = PAINT.print;
  for (let second = 0; second < SECONDS_PER_MINUTE; second += 1) {
    const five = second % TICK_EVERY === 0;
    context.lineWidth = (five ? track.fiveLine : track.line) * scale;
    const angle = toRadians(second * DEGREES_PER_SECOND);
    radialLine(frame, 0, 0, angle, five ? track.five : track.minute, track.outer);
  }
  context.lineWidth = track.line * scale;
  [track.outer, track.minute].forEach((radius) => {
    const [x, y] = toCanvas(frame, 0, 0);
    context.beginPath();
    context.arc(x, y, radius * scale, 0, FULL_CIRCLE);
    context.stroke();
  });
}

function paintSubDial(frame: DialFrame): void {
  const { context, scale } = frame;
  const { subDial, subDialNumbers } = DIAL_PAINT;
  const centre = WHEEL_CENTRES.fourthWheel;
  const [x, y] = toCanvas(frame, centre.x, centre.y);
  for (let ring = 0; ring < subDial.rings; ring += 1) {
    context.strokeStyle = grey(ring % 2 === 0 ? 0.55 : 1, subDial.ringAlpha);
    context.lineWidth = ((DIAL_FACE.subDialRadius / subDial.rings) * scale) / 2;
    context.beginPath();
    context.arc(
      x,
      y,
      ((ring + 0.5) / subDial.rings) * DIAL_FACE.subDialRadius * scale,
      0,
      FULL_CIRCLE,
    );
    context.stroke();
  }
  context.strokeStyle = PAINT.print;
  for (let second = 0; second < SECONDS_PER_MINUTE; second += 1) {
    const five = second % TICK_EVERY === 0;
    context.lineWidth = (five ? subDial.fiveLine : subDial.line) * scale;
    const length = five ? subDial.fiveTick : subDial.tick;
    radialLine(
      frame,
      centre.x,
      centre.y,
      toRadians(second * DEGREES_PER_SECOND),
      DIAL_FACE.subDialRadius - length,
      DIAL_FACE.subDialRadius,
    );
  }
  context.fillStyle = PAINT.print;
  context.font = `${subDialNumbers.size * scale}px ${DIAL_PAINT.subFont}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  SUB_DIAL_NUMBERS.forEach((number) => {
    const angle = toRadians(number * DEGREES_PER_SECOND);
    const [nx, ny] = toCanvas(
      frame,
      centre.x - Math.sin(angle) * subDialNumbers.radius,
      centre.y + Math.cos(angle) * subDialNumbers.radius,
    );
    context.fillText(String(number), nx, ny);
  });
}

function paintWordmark(frame: DialFrame): void {
  const { context, scale } = frame;
  const { wordmark } = DIAL_PAINT;
  context.fillStyle = PAINT.print;
  context.font = `italic ${wordmark.size * scale}px ${DIAL_PAINT.font}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const [x, y] = toCanvas(frame, 0, wordmark.y);
  context.fillText(wordmark.text, x, y);
}

function paintDial(context: CanvasRenderingContext2D, size: number): void {
  const frame: DialFrame = { context, scale: size / (DIAL_RADIUS_MM * 2), centre: size / 2 };
  paintDialBase(frame, size);
  paintMinuteTrack(frame);
  paintSubDial(frame);
  paintWordmark(frame);
}

export function dialFace(): CanvasTexture {
  const texture = canvasTexture(DIAL_FACE.textureSize, paintDial);
  texture.repeat.set(-1 / (DIAL_RADIUS_MM * 2), 1 / (DIAL_RADIUS_MM * 2));
  texture.offset.set(0.5, 0.5);
  return texture;
}

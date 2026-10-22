import { FULL_TURN } from '@core/math';
import { FIELD_LOOKS, LAND_PAINT } from '../palette';
import { extent, middle, shrunk } from '../random';
import type { Range } from '../random';
import { shade } from './colour';
import type { Field } from './fields';
import { acrossZPixels, fillBox, linearGradient, pixelX, pixelY, wrapShifts } from './painter';
import type { Painter } from './painter';
import { waterGradient } from './paintLinears';

const DETAIL_REACH = 700;
const MIN_STRIPE_PX = 2.5;
const TONE_SCRAMBLE = 7.31;
const FLIP_SCRAMBLE = 21.93;
const HALF = 0.5;
const RIDGE_SHARE = 0.3;
const EDGE_SHARE = 0.12;

function fract(value: number): number {
  return value - Math.floor(value);
}

function baseHex(field: Field): string {
  const { colours } = FIELD_LOOKS[field.kind];
  return colours[Math.floor(field.tone * colours.length) % colours.length];
}

function toneFactor(field: Field): number {
  return 1 + (fract(field.tone * TONE_SCRAMBLE) - HALF) * LAND_PAINT.toneSpread;
}

export function fieldColour(field: Field, factor = 1): string {
  return shade(baseHex(field), toneFactor(field) * factor);
}

function lengthGradient(painter: Painter, field: Field): CanvasGradient {
  const spread = LAND_PAINT.lengthShade * HALF;
  const inZ = field.beds === 'z';
  const gradient = linearGradient(painter, inZ, inZ ? field.z : field.x);
  const flip = fract(field.tone * FLIP_SCRAMBLE) > HALF ? 1 : -1;
  gradient.addColorStop(0, fieldColour(field, 1 + flip * spread));
  gradient.addColorStop(1, fieldColour(field, 1 - flip * spread));
  return gradient;
}

function stripes(painter: Painter, field: Field): void {
  const { beds } = FIELD_LOOKS[field.kind];
  if (!beds || Math.abs(middle(field.z)) > DETAIL_REACH) return;
  const style = fieldColour(field, beds.shade);
  const alongZ = field.beds === 'z';
  const range = alongZ ? field.x : field.z;
  const pixels = alongZ
    ? pixelX(painter, beds.spacing)
    : acrossZPixels(painter, middle(field.z), beds.spacing);
  if (pixels < MIN_STRIPE_PX) return;
  for (let start = range[0] + beds.spacing * HALF; start < range[1]; start += beds.spacing) {
    const band: Range = [start, Math.min(range[1], start + beds.width)];
    if (alongZ) fillBox(painter, band, field.z, style);
    else fillBox(painter, field.x, band, style);
  }
}

function orchard(painter: Painter, field: Field): void {
  const { colour, spacing, radius } = LAND_PAINT.orchardDot;
  if (Math.abs(middle(field.z)) > DETAIL_REACH) return;
  const { context } = painter;
  context.fillStyle = colour;
  const rx = pixelX(painter, radius);
  for (let z = field.z[0] + spacing * HALF; z < field.z[1]; z += spacing) {
    const ry = acrossZPixels(painter, z, radius);
    for (let x = field.x[0] + spacing * HALF; x < field.x[1]; x += spacing)
      wrapShifts(painter, [x - radius, x + radius]).forEach((shift) => {
        context.beginPath();
        context.ellipse(pixelX(painter, x + shift), pixelY(painter, z), rx, ry, 0, 0, FULL_TURN);
        context.fill();
      });
  }
}

function greenhouse(painter: Painter, field: Field): void {
  const width = extent(field.x);
  const edge = width * EDGE_SHARE;
  fillBox(
    painter,
    shrunk(field.x, (width * (1 - RIDGE_SHARE)) / 2),
    field.z,
    LAND_PAINT.greenhouseRidge,
  );
  fillBox(painter, [field.x[0], field.x[0] + edge], field.z, LAND_PAINT.greenhouseEdge);
  fillBox(painter, [field.x[1] - edge, field.x[1]], field.z, LAND_PAINT.greenhouseEdge);
}

export function pondWater(field: Field): { x: Range; z: Range } {
  const inset = LAND_PAINT.pondInset;
  return { x: shrunk(field.x, inset), z: shrunk(field.z, inset) };
}

function pond(painter: Painter, field: Field): void {
  fillBox(painter, field.x, field.z, LAND_PAINT.pondBank);
  const water = pondWater(field);
  fillBox(painter, water.x, water.z, waterGradient(painter, true, water.z));
}

function bunds(painter: Painter, field: Field): void {
  const { context } = painter;
  const { bund, bundWidth, bundAlpha } = LAND_PAINT;
  context.globalAlpha = bundAlpha;
  fillBox(painter, field.x, [field.z[1] - bundWidth, field.z[1]], bund);
  fillBox(painter, field.x, [field.z[0], field.z[0] + bundWidth], bund);
  fillBox(painter, [field.x[0], field.x[0] + bundWidth], field.z, bund);
  fillBox(painter, [field.x[1] - bundWidth, field.x[1]], field.z, bund);
  context.globalAlpha = 1;
}

export function paintField(painter: Painter, field: Field): void {
  if (field.kind === 'pond') {
    pond(painter, field);
    return;
  }
  fillBox(painter, field.x, field.z, lengthGradient(painter, field));
  if (field.kind === 'greenhouse') {
    greenhouse(painter, field);
    return;
  }
  if (field.kind === 'orchard') orchard(painter, field);
  else stripes(painter, field);
  bunds(painter, field);
}

export function paintFields(painter: Painter, fields: readonly Field[]): void {
  painter.context.fillStyle = LAND_PAINT.ditch;
  painter.context.fillRect(0, 0, painter.width, painter.height);
  fields.forEach((field) => paintField(painter, field));
}

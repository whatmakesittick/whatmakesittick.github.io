import { FIELD_LOOKS, LAND_PAINT } from '../palette';
import type { Range } from '../random';
import { shade } from './colour';
import type { Field } from './fields';
import { acrossZPixels, alongXPixels, fillBox, pixelX, pixelY, wrapShifts } from './painter';
import type { Painter } from './painter';

const DETAIL_REACH = 700;
const MIN_STRIPE_PX = 2.5;
const TONE_SCRAMBLE = 7.31;
const HALF = 0.5;
const RIDGE_SHARE = 0.3;
const EDGE_SHARE = 0.12;

function fract(value: number): number {
  return value - Math.floor(value);
}

function middle([from, to]: Range): number {
  return (from + to) / 2;
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
  const { context } = painter;
  const spread = LAND_PAINT.lengthShade * HALF;
  const gradient =
    field.beds === 'z'
      ? context.createLinearGradient(0, pixelY(painter, field.z[1]), 0, pixelY(painter, field.z[0]))
      : context.createLinearGradient(
          pixelX(painter, field.x[0]),
          0,
          pixelX(painter, field.x[1]),
          0,
        );
  const flip = fract(field.tone * TONE_SCRAMBLE * 3) > HALF ? 1 : -1;
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
    ? alongXPixels(painter, beds.spacing)
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
  const rx = alongXPixels(painter, radius);
  for (let z = field.z[0] + spacing * HALF; z < field.z[1]; z += spacing) {
    const ry = acrossZPixels(painter, z, radius);
    for (let x = field.x[0] + spacing * HALF; x < field.x[1]; x += spacing)
      wrapShifts(painter, [x - radius, x + radius]).forEach((shift) => {
        context.beginPath();
        context.ellipse(pixelX(painter, x + shift), pixelY(painter, z), rx, ry, 0, 0, Math.PI * 2);
        context.fill();
      });
  }
}

function greenhouse(painter: Painter, field: Field): void {
  const width = field.x[1] - field.x[0];
  const ridge: Range = [
    middle(field.x) - (width * RIDGE_SHARE) / 2,
    middle(field.x) + (width * RIDGE_SHARE) / 2,
  ];
  const edge = width * EDGE_SHARE;
  fillBox(painter, ridge, field.z, LAND_PAINT.greenhouseRidge);
  fillBox(painter, [field.x[0], field.x[0] + edge], field.z, LAND_PAINT.greenhouseEdge);
  fillBox(painter, [field.x[1] - edge, field.x[1]], field.z, LAND_PAINT.greenhouseEdge);
}

export function pondWater(field: Field): { x: Range; z: Range } {
  const inset = LAND_PAINT.pondInset;
  return {
    x: [field.x[0] + inset, field.x[1] - inset],
    z: [field.z[0] + inset, field.z[1] - inset],
  };
}

function pond(painter: Painter, field: Field): void {
  fillBox(painter, field.x, field.z, LAND_PAINT.pondBank);
  const water = pondWater(field);
  const { context } = painter;
  const gradient = context.createLinearGradient(
    0,
    pixelY(painter, water.z[1]),
    0,
    pixelY(painter, water.z[0]),
  );
  gradient.addColorStop(0, LAND_PAINT.water.edge);
  gradient.addColorStop(HALF, LAND_PAINT.water.middle);
  gradient.addColorStop(1, LAND_PAINT.water.edge);
  fillBox(painter, water.x, water.z, gradient);
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

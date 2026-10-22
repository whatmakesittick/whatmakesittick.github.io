import { LAND_PAINT } from '../palette';
import { between, seededRandom } from '../random';
import type { Random, Range } from '../random';
import { footprint } from './blocks';
import type { Linear } from './linears';
import { fillBox, pixelX, pixelY } from './painter';
import type { Painter } from './painter';

const HALF = 0.5;
const GLINT_SEED = 7_301;
const EDGE_INSET = 0.35;

interface Box {
  readonly x: Range;
  readonly z: Range;
}

function band(linear: Linear, [from, to]: Range): Box {
  return linear.axis === 'x'
    ? { x: linear.span, z: [from, to] }
    : { x: [from, to], z: linear.span };
}

function centred(linear: Linear, width: number): Range {
  return [linear.centre - width / 2, linear.centre + width / 2];
}

function fill(painter: Painter, box: Box, style: string | CanvasGradient): void {
  fillBox(painter, box.x, box.z, style);
}

export function waterBox(linear: Linear): Box {
  return band(linear, centred(linear, linear.width));
}

function acrossGradient(painter: Painter, linear: Linear): CanvasGradient {
  const [from, to] = centred(linear, linear.width);
  const { context } = painter;
  const gradient =
    linear.axis === 'x'
      ? context.createLinearGradient(0, pixelY(painter, to), 0, pixelY(painter, from))
      : context.createLinearGradient(pixelX(painter, from), 0, pixelX(painter, to), 0);
  gradient.addColorStop(0, LAND_PAINT.water.edge);
  gradient.addColorStop(HALF, LAND_PAINT.water.middle);
  gradient.addColorStop(1, LAND_PAINT.water.edge);
  return gradient;
}

function glints(painter: Painter, linear: Linear, random: Random): void {
  const { length, width, density } = LAND_PAINT.glint;
  const [from, to] = linear.span;
  const count = Math.round((to - from) * density * (linear.width / 4));
  painter.context.globalAlpha = LAND_PAINT.water.glintAlpha;
  for (let index = 0; index < count; index += 1) {
    const along = between(random, linear.span);
    const across = linear.centre + (random() - HALF) * linear.width * HALF;
    const streak: Range = [along, along + between(random, length)];
    const thin: Range = [across, across + width];
    fill(
      painter,
      linear.axis === 'x' ? { x: streak, z: thin } : { x: thin, z: streak },
      LAND_PAINT.water.glint,
    );
  }
  painter.context.globalAlpha = 1;
}

function water(painter: Painter, linear: Linear, random: Random): void {
  fill(painter, band(linear, footprint(linear)), LAND_PAINT.waterBank);
  fill(painter, waterBox(linear), acrossGradient(painter, linear));
  glints(painter, linear, random);
}

function dashes(painter: Painter, linear: Linear): void {
  const { length, gap } = LAND_PAINT.dash;
  const thin = centred(linear, LAND_PAINT.road.lineWidth);
  const [from, to] = linear.span;
  for (let along = from; along < to; along += length + gap) {
    const dash: Range = [along, along + length];
    fill(
      painter,
      linear.axis === 'x' ? { x: dash, z: thin } : { x: thin, z: dash },
      LAND_PAINT.road.line,
    );
  }
}

function road(painter: Painter, linear: Linear): void {
  const { verge, surface, line, lineWidth } = LAND_PAINT.road;
  fill(painter, band(linear, footprint(linear)), verge);
  fill(painter, band(linear, centred(linear, linear.width)), surface);
  const edge = linear.width / 2 - EDGE_INSET;
  [-1, 1].forEach((side) => {
    const at = linear.centre + side * edge;
    fill(painter, band(linear, [at - lineWidth / 2, at + lineWidth / 2]), line);
  });
  dashes(painter, linear);
}

function lane(painter: Painter, linear: Linear): void {
  fill(painter, band(linear, footprint(linear)), LAND_PAINT.lane.verge);
  fill(painter, band(linear, centred(linear, linear.width)), LAND_PAINT.lane.surface);
}

export function paintLinears(painter: Painter, linears: readonly Linear[]): void {
  const random = seededRandom(GLINT_SEED);
  const ordered = [...linears].sort((a, b) => Number(isWater(b)) - Number(isWater(a)));
  ordered.forEach((linear) => {
    if (isWater(linear)) water(painter, linear, random);
    else if (linear.kind === 'road') road(painter, linear);
    else lane(painter, linear);
  });
}

export function isWater(linear: Linear): boolean {
  return linear.kind === 'canal' || linear.kind === 'river';
}

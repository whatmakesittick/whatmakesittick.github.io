import { SIDE_SIGNS } from '../../../../model';
import { LAND_PAINT } from '../palette';
import { around, between, extent, seededRandom } from '../random';
import type { Random, Range } from '../random';
import { footprint } from './blocks';
import type { Linear } from './linears';
import { fillArea, linearGradient } from './painter';
import type { Area, Painter } from './painter';

const HALF = 0.5;
const GLINT_SEED = 7_301;
const EDGE_INSET = 0.35;

function band(linear: Linear, across: Range, along = linear.span): Area {
  return linear.axis === 'x' ? { x: along, z: across } : { x: across, z: along };
}

function centred(linear: Linear): Range {
  return around(linear.centre, linear.width / 2);
}

export function waterBox(linear: Linear): Area {
  return band(linear, centred(linear));
}

export function waterGradient(painter: Painter, inZ: boolean, range: Range): CanvasGradient {
  const gradient = linearGradient(painter, inZ, range);
  gradient.addColorStop(0, LAND_PAINT.water.edge);
  gradient.addColorStop(HALF, LAND_PAINT.water.middle);
  gradient.addColorStop(1, LAND_PAINT.water.edge);
  return gradient;
}

function glints(painter: Painter, linear: Linear, random: Random): void {
  const { length, width, density } = LAND_PAINT.glint;
  const count = Math.round(extent(linear.span) * density * (linear.width / 4));
  painter.context.globalAlpha = LAND_PAINT.water.glintAlpha;
  for (let index = 0; index < count; index += 1) {
    const along = between(random, linear.span);
    const across = linear.centre + (random() - HALF) * linear.width * HALF;
    const streak: Range = [along, along + between(random, length)];
    fillArea(painter, band(linear, [across, across + width], streak), LAND_PAINT.water.glint);
  }
  painter.context.globalAlpha = 1;
}

function surfaces(
  painter: Painter,
  linear: Linear,
  verge: string,
  surface: string | CanvasGradient,
): void {
  fillArea(painter, band(linear, footprint(linear)), verge);
  fillArea(painter, waterBox(linear), surface);
}

function water(painter: Painter, linear: Linear, random: Random): void {
  const gradient = waterGradient(painter, linear.axis === 'x', centred(linear));
  surfaces(painter, linear, LAND_PAINT.waterBank, gradient);
  glints(painter, linear, random);
}

function dashes(painter: Painter, linear: Linear): void {
  const { length, gap } = LAND_PAINT.dash;
  const thin = around(linear.centre, LAND_PAINT.road.lineWidth / 2);
  const [from, to] = linear.span;
  for (let along = from; along < to; along += length + gap)
    fillArea(painter, band(linear, thin, [along, along + length]), LAND_PAINT.road.line);
}

function road(painter: Painter, linear: Linear): void {
  const { verge, surface, line, lineWidth } = LAND_PAINT.road;
  surfaces(painter, linear, verge, surface);
  const edge = linear.width / 2 - EDGE_INSET;
  SIDE_SIGNS.forEach((side) =>
    fillArea(painter, band(linear, around(linear.centre + side * edge, lineWidth / 2)), line),
  );
  dashes(painter, linear);
}

function lane(painter: Painter, linear: Linear): void {
  surfaces(painter, linear, LAND_PAINT.lane.verge, LAND_PAINT.lane.surface);
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

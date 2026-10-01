import { CARTRIDGE } from '../../model/layout';
import {
  BULLET_SHAPE,
  CASE_SHAPE,
  CASE_SHOULDER_RADIUS,
  POWDER_FILL,
  PRIMER_SHAPE,
} from '../constants';
import type { TurnPoint, TurnStrand } from './turned';

const BODY_START = CASE_SHAPE.groove.x[1] + 0.3;
const BODY_RADIUS = CASE_SHAPE.rim - 0.05;

function edges(points: readonly TurnPoint[]): TurnStrand[] {
  return points.map((point, index) => [point, points[(index + 1) % points.length]]);
}

function lerpRadius(from: TurnPoint, to: TurnPoint, x: number): number {
  return from[1] + ((to[1] - from[1]) * (x - from[0])) / (to[0] - from[0]);
}

const INNER_BODY_START: TurnPoint = [CASE_SHAPE.head, BODY_RADIUS - CASE_SHAPE.wall];
const INNER_SHOULDER: TurnPoint = [CASE_SHAPE.shoulderX, CASE_SHOULDER_RADIUS - CASE_SHAPE.wall];

export function caseOutline(): TurnPoint[] {
  const { rim, groove, shoulderX, neckX, head, pocket, flashHole } = CASE_SHAPE;
  const mouth = CARTRIDGE.caseLength;
  return [
    [0, pocket.radius],
    [0, rim],
    [groove.x[0], rim],
    [groove.x[0] + 0.2, groove.radius],
    [groove.x[1], groove.radius],
    [BODY_START, BODY_RADIUS],
    [shoulderX, CASE_SHOULDER_RADIUS],
    [neckX, CARTRIDGE.neckRadius],
    [mouth, CARTRIDGE.neckRadius],
    [mouth, CARTRIDGE.bulletRadius],
    [neckX, CARTRIDGE.bulletRadius],
    INNER_SHOULDER,
    INNER_BODY_START,
    [head, flashHole],
    [pocket.depth, flashHole],
    [pocket.depth, pocket.radius],
  ];
}

export function caseStrands(): TurnStrand[] {
  return edges(caseOutline());
}

export function primerStrands(): TurnStrand[] {
  const { recess, depth, radius } = PRIMER_SHAPE;
  return edges([
    [recess, 0],
    [recess, radius],
    [depth, radius],
    [depth, 0],
  ]).slice(0, 3);
}

export function powderStrands(): TurnStrand[] {
  const end = CARTRIDGE.length - CARTRIDGE.bulletLength - POWDER_FILL.gap;
  const start = POWDER_FILL.start;
  const radiusAt = (x: number) => lerpRadius(INNER_BODY_START, INNER_SHOULDER, x) - POWDER_FILL.gap;
  return edges([
    [start, 0],
    [start, radiusAt(start)],
    [end, radiusAt(end)],
    [end, 0],
  ]).slice(0, 3);
}

export function bulletStrands(): TurnStrand[] {
  const { heel, heelRadius, bearingEnd, ogive } = BULLET_SHAPE;
  const radius = CARTRIDGE.bulletRadius;
  return [
    [
      [0, 0],
      [0, heelRadius],
    ],
    [
      [0, heelRadius],
      [heel, radius],
    ],
    [
      [heel, radius],
      [bearingEnd, radius],
    ],
    [[bearingEnd, radius], ...ogive, [CARTRIDGE.bulletLength, 0]],
  ];
}

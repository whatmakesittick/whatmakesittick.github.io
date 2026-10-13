import type { AnchorId, Point } from '../ids';
import { DRIVE_LINKS, SPROCKET_TEETH } from './constants';
import { CHAIN_LOOP_MM, DRIVE_LINK_MM, wrapChain } from './drive';
import { BAR_PLANE_Z, CRANK_Y, SAW_GEOMETRY } from './scale';

const MM_PER_METRE = 1000;
const SOLVE_STEPS = 60;

export const SPROCKET_RADIUS =
  DRIVE_LINK_MM / MM_PER_METRE / (2 * Math.sin(Math.PI / SPROCKET_TEETH));
export const NOSE_RADIUS = 0.0245;
export const BAR_HEEL_X = 0.045;
export const BAR_HEEL_HALF_HEIGHT = 0.02717;

const FULL_TURN_RAD = 2 * Math.PI;

interface Shape {
  sprocketLeave: number;
  noseMeet: number;
  climb: number;
  rail: number;
  noseArc: number;
  sprocketArc: number;
}

function tangentFrom(
  pointX: number,
  pointY: number,
  centreX: number,
  radius: number,
  side: 1 | -1,
): number {
  const dx = pointX - centreX;
  const toPoint = Math.atan2(pointY, dx);
  return toPoint + side * Math.acos(radius / Math.hypot(dx, pointY));
}

function shapeFor(noseX: number): Shape {
  const sprocketLeave = tangentFrom(BAR_HEEL_X, BAR_HEEL_HALF_HEIGHT, 0, SPROCKET_RADIUS, 1);
  const noseMeet = tangentFrom(BAR_HEEL_X, BAR_HEEL_HALF_HEIGHT, noseX, NOSE_RADIUS, -1);
  const climb = Math.hypot(
    BAR_HEEL_X - SPROCKET_RADIUS * Math.cos(sprocketLeave),
    BAR_HEEL_HALF_HEIGHT - SPROCKET_RADIUS * Math.sin(sprocketLeave),
  );
  const rail = Math.hypot(
    noseX + NOSE_RADIUS * Math.cos(noseMeet) - BAR_HEEL_X,
    NOSE_RADIUS * Math.sin(noseMeet) - BAR_HEEL_HALF_HEIGHT,
  );
  return {
    sprocketLeave,
    noseMeet,
    climb,
    rail,
    noseArc: 2 * NOSE_RADIUS * noseMeet,
    sprocketArc: SPROCKET_RADIUS * (FULL_TURN_RAD - 2 * sprocketLeave),
  };
}

function loopLength(noseX: number): number {
  const { climb, rail, noseArc, sprocketArc } = shapeFor(noseX);
  return 2 * climb + 2 * rail + noseArc + sprocketArc;
}

function solveNoseX(target: number): number {
  let low = BAR_HEEL_X + NOSE_RADIUS;
  let high = target;
  for (let step = 0; step < SOLVE_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (loopLength(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export const NOSE_X = solveNoseX(CHAIN_LOOP_MM / MM_PER_METRE);

const SHAPE = shapeFor(NOSE_X);

export interface LoopPoint {
  x: number;
  y: number;
  angle: number;
}

type Plane = readonly [x: number, y: number];

function circlePoint(centreX: number, radius: number, normal: number): Plane {
  return [centreX + radius * Math.cos(normal), CRANK_Y + radius * Math.sin(normal)];
}

const SPROCKET_TOP = circlePoint(0, SPROCKET_RADIUS, SHAPE.sprocketLeave);
const SPROCKET_BOTTOM = circlePoint(0, SPROCKET_RADIUS, -SHAPE.sprocketLeave);
const HEEL_TOP: Plane = [BAR_HEEL_X, CRANK_Y + BAR_HEEL_HALF_HEIGHT];
const HEEL_BOTTOM: Plane = [BAR_HEEL_X, CRANK_Y - BAR_HEEL_HALF_HEIGHT];
const NOSE_TOP = circlePoint(NOSE_X, NOSE_RADIUS, SHAPE.noseMeet);
const NOSE_BOTTOM = circlePoint(NOSE_X, NOSE_RADIUS, -SHAPE.noseMeet);

export const CHAIN_PATH = {
  centreY: CRANK_Y,
  planeZ: BAR_PLANE_Z,
  sprocketRadius: SPROCKET_RADIUS,
  noseRadius: NOSE_RADIUS,
  noseX: NOSE_X,
  heelX: BAR_HEEL_X,
  heelHalfHeight: BAR_HEEL_HALF_HEIGHT,
  sprocketLeave: SHAPE.sprocketLeave,
  noseMeet: SHAPE.noseMeet,
  noseMeetX: NOSE_TOP[0],
  segments: [SHAPE.climb, SHAPE.rail, SHAPE.noseArc, SHAPE.rail, SHAPE.climb, SHAPE.sprocketArc],
} as const;

function onLine(from: Plane, to: Plane, distance: number): LoopPoint {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return {
    x: from[0] + distance * Math.cos(angle),
    y: from[1] + distance * Math.sin(angle),
    angle,
  };
}

function onArc(centreX: number, radius: number, normal: number): LoopPoint {
  const [x, y] = circlePoint(centreX, radius, normal);
  return { x, y, angle: normal - Math.PI / 2 };
}

const PIECES: readonly ((distance: number) => LoopPoint)[] = [
  (s) => onLine(SPROCKET_TOP, HEEL_TOP, s),
  (s) => onLine(HEEL_TOP, NOSE_TOP, s),
  (s) => onArc(NOSE_X, NOSE_RADIUS, SHAPE.noseMeet - s / NOSE_RADIUS),
  (s) => onLine(NOSE_BOTTOM, HEEL_BOTTOM, s),
  (s) => onLine(HEEL_BOTTOM, SPROCKET_BOTTOM, s),
  (s) => onArc(0, SPROCKET_RADIUS, -SHAPE.sprocketLeave - s / SPROCKET_RADIUS),
];

export function pointOnLoop(mm: number): LoopPoint {
  let s = wrapChain(mm) / MM_PER_METRE;
  const last = PIECES.length - 1;
  for (let index = 0; index < last; index += 1) {
    const length = CHAIN_PATH.segments[index];
    if (s < length) return PIECES[index](s);
    s -= length;
  }
  return PIECES[last](s);
}

export type RailSide = 'upper' | 'lower';

export function railY(x: number, side: RailSide): number {
  const share = (x - BAR_HEEL_X) / (NOSE_TOP[0] - BAR_HEEL_X);
  const offset = BAR_HEEL_HALF_HEIGHT + share * (NOSE_TOP[1] - CRANK_Y - BAR_HEEL_HALF_HEIGHT);
  return CRANK_Y + (side === 'upper' ? offset : -offset);
}

export type ChainElementKind = 'cutterLeft' | 'cutterRight' | 'plain';

export interface ChainElement {
  index: number;
  offsetMm: number;
  kind: ChainElementKind;
}

const LINKS_PER_CUTTER = 2;
function kindOf(index: number): ChainElementKind {
  if (index % LINKS_PER_CUTTER !== 0 || index + LINKS_PER_CUTTER >= DRIVE_LINKS) return 'plain';
  return (index / LINKS_PER_CUTTER) % 2 === 0 ? 'cutterLeft' : 'cutterRight';
}

export const CHAIN_ELEMENTS: readonly ChainElement[] = Array.from(
  { length: DRIVE_LINKS },
  (_, index) => ({ index, offsetMm: index * DRIVE_LINK_MM, kind: kindOf(index) }),
);

export function elementPosition(element: ChainElement, chainMm: number): LoopPoint {
  return pointOnLoop(element.offsetMm + chainMm);
}

const BRANCH_RADIUS = 0.05;
const BRANCH_TOUCH_RAD = Math.PI / 4;

export const KICKBACK_BRANCH_CENTRE: Point = [
  NOSE_X + (NOSE_RADIUS + BRANCH_RADIUS) * Math.cos(BRANCH_TOUCH_RAD),
  CRANK_Y + (NOSE_RADIUS + BRANCH_RADIUS) * Math.sin(BRANCH_TOUCH_RAD),
  BAR_PLANE_Z,
];

export const KICKBACK_BRANCH_RADIUS = BRANCH_RADIUS;

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  crank: [0, CRANK_Y, 0],
  sprocket: [0, CRANK_Y, BAR_PLANE_Z],
  nose: [NOSE_X, CRANK_Y, BAR_PLANE_Z],
  rearGrip: SAW_GEOMETRY.rearGrip,
};

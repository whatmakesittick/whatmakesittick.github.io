import type { AnchorId, Point } from '../ids';
import { DRIVE_LINKS, SPROCKET_TEETH } from './constants';
import { CHAIN_LOOP_MM, DRIVE_LINK_MM, wrapChain } from './drive';
import { BAR_PLANE_Z, CRANK_Y, SAW_GEOMETRY } from './scale';

const MM_PER_METRE = 1000;
const SOLVE_STEPS = 60;

export const SPROCKET_RADIUS =
  DRIVE_LINK_MM / MM_PER_METRE / (2 * Math.sin(Math.PI / SPROCKET_TEETH));
export const NOSE_RADIUS = 0.02;

function loopLength(distance: number): number {
  const offset = SPROCKET_RADIUS - NOSE_RADIUS;
  const alpha = Math.asin(offset / distance);
  return (
    2 * Math.sqrt(distance ** 2 - offset ** 2) +
    SPROCKET_RADIUS * (Math.PI + 2 * alpha) +
    NOSE_RADIUS * (Math.PI - 2 * alpha)
  );
}

function solveNoseX(target: number): number {
  let low = SPROCKET_RADIUS + NOSE_RADIUS;
  let high = target;
  for (let step = 0; step < SOLVE_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (loopLength(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export const NOSE_X = solveNoseX(CHAIN_LOOP_MM / MM_PER_METRE);

const ALPHA = Math.asin((SPROCKET_RADIUS - NOSE_RADIUS) / NOSE_X);
const RUN = NOSE_X * Math.cos(ALPHA);
const NOSE_ARC = NOSE_RADIUS * (Math.PI - 2 * ALPHA);
const SPROCKET_ARC = SPROCKET_RADIUS * (Math.PI + 2 * ALPHA);
const TOP_NORMAL = Math.PI / 2 - ALPHA;

export const CHAIN_PATH = {
  centreY: CRANK_Y,
  planeZ: BAR_PLANE_Z,
  sprocketRadius: SPROCKET_RADIUS,
  noseRadius: NOSE_RADIUS,
  noseX: NOSE_X,
  run: RUN,
  noseArc: NOSE_ARC,
  sprocketArc: SPROCKET_ARC,
} as const;

export interface LoopPoint {
  x: number;
  y: number;
  angle: number;
}

function onCircle(centreX: number, radius: number, normal: number): LoopPoint {
  return {
    x: centreX + radius * Math.cos(normal),
    y: CRANK_Y + radius * Math.sin(normal),
    angle: normal - Math.PI / 2,
  };
}

function along(start: LoopPoint, distance: number): LoopPoint {
  return {
    x: start.x + distance * Math.cos(start.angle),
    y: start.y + distance * Math.sin(start.angle),
    angle: start.angle,
  };
}

export function pointOnLoop(mm: number): LoopPoint {
  let s = wrapChain(mm) / MM_PER_METRE;
  if (s < RUN) return along(onCircle(0, SPROCKET_RADIUS, TOP_NORMAL), s);
  s -= RUN;
  if (s < NOSE_ARC) return onCircle(NOSE_X, NOSE_RADIUS, TOP_NORMAL - s / NOSE_RADIUS);
  s -= NOSE_ARC;
  if (s < RUN) return along(onCircle(NOSE_X, NOSE_RADIUS, -TOP_NORMAL), s);
  s -= RUN;
  return onCircle(0, SPROCKET_RADIUS, -TOP_NORMAL - s / SPROCKET_RADIUS);
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

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  crank: [0, CRANK_Y, 0],
  sprocket: [0, CRANK_Y, BAR_PLANE_Z],
  nose: [NOSE_X, CRANK_Y, BAR_PLANE_Z],
  rearGrip: SAW_GEOMETRY.rearGrip,
};

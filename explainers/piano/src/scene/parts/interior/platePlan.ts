import type { PlanPoint } from '@core/scene/geometry/extrude';
import { BRIDGE, CASE, KEYS, STRINGS, stringPath } from '../../../model';
import { CASE_OUTLINE, insetOutline } from '../../geometry/outline';
import type { Ring } from '../../geometry/section';
import { lineCrossings } from '../../geometry/section';
import { BREAK_KEYS, BRIDGE_PLAN, PLATE_PLAN, STRUT, TUNING_PIN } from './constants';
import { BASS_BRIDGE, MAIN_BRIDGE, behindBack } from './bridgePlan';
import { PIANO_STRINGS, unisonOf } from './layout';
import type { PianoString } from './layout';
import {
  add,
  arcBelow,
  circle,
  lastOf,
  leftOf,
  lineHit,
  plan,
  polylineHit,
  quad,
  spanAtZ,
  sub,
} from './planMath';

interface Line {
  readonly origin: PlanPoint;
  readonly direction: PlanPoint;
}

const STRAIGHT_BACK: PlanPoint = { x: 0, z: -1 };
const ACROSS: PlanPoint = { x: 1, z: 0 };
const PIN_HOLE_SIDES = 6;
const HOLE_CLEARANCE = BRIDGE.width;
const GAP = BRIDGE_PLAN.floorGap;
const FIRST_KEY = 1;

export const PLATE_RIM = insetOutline(CASE_OUTLINE, CASE.rimThickness + PLATE_PLAN.gap);
const BAND_INNER = insetOutline(
  CASE_OUTLINE,
  CASE.rimThickness + PLATE_PLAN.gap + PLATE_PLAN.bandWidth,
);

function stringLine(string: PianoString, offset: number): Line {
  const direction = plan(string.direction);
  return { origin: add(plan(string.front), leftOf(direction), offset), direction };
}

function hit(a: Line, b: Line): PlanPoint {
  return lineHit(a.origin, a.direction, b.origin, b.direction);
}

const BASS_FIRST = PIANO_STRINGS[0];
const BASS_LAST = lastOf(unisonOf(STRINGS.bassTopKey));
const TENOR_FIRST = unisonOf(STRINGS.bassTopKey + 1)[0];

function tenorEndCorner(): PlanPoint {
  const { front, normals, tangents } = MAIN_BRIDGE;
  return add(add(front[0], tangents[0], -GAP), normals[0], GAP);
}

function floorOuter(): PlanPoint[] {
  const bassEdge = stringLine(BASS_FIRST, PLATE_PLAN.stringClearance);
  const tenorEdge = stringLine(TENOR_FIRST, PLATE_PLAN.stringClearance);
  const bridgeEdge = behindBack(MAIN_BRIDGE, GAP, GAP);
  const front = lastOf(bridgeEdge).z;
  const [left, right] = spanAtZ(PLATE_RIM, front);
  return [
    { x: left, z: front },
    hit(bassEdge, { origin: { x: 0, z: front }, direction: ACROSS }),
    hit(bassEdge, tenorEdge),
    tenorEndCorner(),
    ...bridgeEdge,
    { x: right, z: front },
    ...arcBelow(PLATE_RIM, front).slice(1, -1),
  ];
}

function hitchLine(): PlanPoint[] {
  const keys = Array.from({ length: KEYS - STRINGS.bassTopKey }, (_, index) => {
    return STRINGS.bassTopKey + 1 + index;
  });
  return keys.map((key) => {
    const { hitch, front, back } = stringPath(key);
    const direction = sub(plan(back), plan(front));
    const length = Math.hypot(direction.x, direction.z);
    return add(plan(hitch), direction, PLATE_PLAN.hitchBehind / length);
  });
}

function bassHole(): PlanPoint[] {
  const left = stringLine(BASS_FIRST, HOLE_CLEARANCE);
  const right = stringLine(BASS_LAST, -HOLE_CLEARANCE);
  const hitches = hitchLine();
  const leftHit = polylineHit(hitches, left.origin, left.direction);
  const rightHit = polylineHit(hitches, right.origin, right.direction);
  const bridgeEdge = behindBack(BASS_BRIDGE, GAP, GAP);
  const last = bridgeEdge.length - 1;
  const across = (index: number): Line => ({
    origin: bridgeEdge[index],
    direction: BASS_BRIDGE.normals[index],
  });
  const front =
    leftHit && rightHit
      ? [leftHit.point, ...hitches.slice(leftHit.index + 1, rightHit.index + 1), rightHit.point]
      : [left.origin, right.origin];
  return [
    ...front,
    hit(right, across(last)),
    ...bridgeEdge.slice().reverse(),
    hit(left, across(0)),
  ];
}

export interface PlateHoleSpot {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export const ROUND_OPENINGS: readonly PlateHoleSpot[] = [
  { x: -0.585, z: -0.8, radius: 0.045 },
  { x: -0.55, z: -1.25, radius: 0.07 },
  { x: -0.46, z: -1.8, radius: 0.09 },
  { x: -0.4, z: -2.38, radius: 0.075 },
  { x: 0.17, z: -1.02, radius: 0.06 },
  { x: 0.43, z: -0.78, radius: 0.04 },
];
const ROUND_SIDES = 24;

export const FLOOR_RINGS: readonly Ring[] = [
  floorOuter(),
  bassHole(),
  ...ROUND_OPENINGS.map((spot) => circle(spot, spot.radius, ROUND_SIDES)),
];

function webBack(): PlanPoint[] {
  return Array.from({ length: KEYS }, (_, index) => {
    const { x, z } = plan(stringPath(FIRST_KEY + index).front);
    return { x, z: z + PLATE_PLAN.webClearance };
  });
}

function webOuter(): PlanPoint[] {
  const back = webBack();
  const [left, right] = spanAtZ(PLATE_RIM, PLATE_PLAN.frontZ);
  return [
    { x: left, z: PLATE_PLAN.frontZ },
    { x: right, z: PLATE_PLAN.frontZ },
    { x: right, z: lastOf(back).z },
    ...back.slice().reverse(),
    { x: left, z: back[0].z },
  ];
}

export const WEB_RINGS: readonly Ring[] = [
  webOuter(),
  ...PIANO_STRINGS.map((string) => circle(plan(string.pin), TUNING_PIN.hole, PIN_HOLE_SIDES)),
];

function band(fromZ: number): Ring {
  return [...arcBelow(PLATE_RIM, fromZ), ...arcBelow(BAND_INNER, fromZ).reverse()];
}

export const BAND_TOP_RING = band(PLATE_PLAN.frontZ - PLATE_PLAN.bandWidth);
export const BAND_WALL_RING = band(PLATE_PLAN.wallFrontZ);

function rimExit(origin: PlanPoint, direction: PlanPoint): PlanPoint {
  const spans = lineCrossings([PLATE_RIM], { origin, direction });
  const exit = spans.find(([start, end]) => start <= 0 && end >= 0) ?? lastOf(spans);
  return add(origin, direction, exit[1] - PLATE_PLAN.bandWidth / 2);
}

function strutFrom(start: PlanPoint, direction: PlanPoint): Ring {
  return quad(start, rimExit(start, direction), STRUT.width);
}

function breakBar(): Line {
  return stringLine(BASS_LAST, -(PLATE_PLAN.stringClearance + STRUT.width / 2));
}

function trebleStrutX(): number {
  const below = lastOf(unisonOf(BREAK_KEYS.treble));
  const above = unisonOf(BREAK_KEYS.treble + 1)[0];
  return (below.front[0] + above.front[0]) / 2;
}

function tenorStrut(bar: Line): Ring {
  const above = unisonOf(BREAK_KEYS.tenor + 1)[0];
  const x = above.front[0] - PLATE_PLAN.stringClearance - STRUT.width / 2;
  const start = lineHit({ x, z: 0 }, STRAIGHT_BACK, bar.origin, bar.direction);
  return strutFrom(start, STRAIGHT_BACK);
}

function struts(): Ring[] {
  const bar = breakBar();
  const trebleKey = unisonOf(BREAK_KEYS.treble)[0];
  return [
    strutFrom(add(bar.origin, bar.direction, -STRUT.webOverlap), bar.direction),
    strutFrom({ x: trebleStrutX(), z: trebleKey.front[2] + STRUT.webOverlap }, STRAIGHT_BACK),
    tenorStrut(bar),
  ];
}

export const STRUT_RINGS: readonly Ring[] = struts();

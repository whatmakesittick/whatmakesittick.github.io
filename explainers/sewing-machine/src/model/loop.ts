import { lerp, smoothstep } from '@core/math';
import { wrapPhase } from '@core/store';
import { PHASE_RANGES, STITCH_CYCLE } from './cycle';
import { FABRIC_TOP, PLATE_BOTTOM, THREAD_RADIUS, stitchProfile } from './fabric';
import type { Tension } from './fabric';
import { BOBBIN_CASE, HOOK, HOOK_POINT_HEIGHT, hookPlanPoint, hookRotation } from './hook';
import { NEEDLE, needleEyeHeight } from './needle';

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

const LOOP_POINT = {
  eye: 0,
  needleTop: 1,
  needleBottom: 2,
  needleCorner: 3,
  bightLow: 4,
  bightMid: 5,
  bightHigh: 6,
  fabricCorner: 7,
  holeBottom: 8,
  holeTop: 9,
} as const;

export const LOOP_POINT_COUNT = Object.keys(LOOP_POINT).length;

const HALF_TURN = STITCH_CYCLE / 2;

const LOOP_TIMING = {
  bulgeStart: PHASE_RANGES.loop.start,
  catch: HOOK.catchAngle,
  farSide: HOOK.catchAngle + HALF_TURN / HOOK.turnsPerStitch,
  castOffStart: PHASE_RANGES.set.start,
  tightenStart: 344,
  end: STITCH_CYCLE,
} as const;

export const LOOP_GEOMETRY = {
  strandSpread: 0.35,
  rowSpread: 0.3,
  cornerRadius: 13,
  catchRadius: 14.3,
  bightRadius: 13.6,
  beakBulge: 0.1,
  upperLevel: BOBBIN_CASE.top + 0.6,
  lowerLevel: BOBBIN_CASE.bottom - 0.8,
  openingSweep: 60,
} as const;

const BULGE = {
  corner: 0.6,
  bightLow: 1,
  bightMid: NEEDLE.scarfAboveEye,
  bightHigh: 3,
  top: 3.4,
  shoulder: 0.75,
} as const;

const BACK_OFFSET = NEEDLE.radius + THREAD_RADIUS;
const BACK_RADIUS = HOOK.axisOffset + BACK_OFFSET;
const CORNER_Z = HOOK.axisOffset - LOOP_GEOMETRY.cornerRadius;
const CATCH_SHOULDER = lerp(BACK_RADIUS, LOOP_GEOMETRY.catchRadius, BULGE.shoulder);

function place(point: Point3, x: number, y: number, z: number): void {
  point.x = x;
  point.y = y;
  point.z = z;
}

function placeOnHook(point: Point3, hookDegrees: number, radius: number, y: number): void {
  const plan = hookPlanPoint(hookDegrees, radius);
  place(point, plan.x, y, plan.z);
}

function copyPoint(target: Point3, source: Point3): void {
  place(target, source.x, source.y, source.z);
}

function lerpPoint(point: Point3, x: number, y: number, z: number, share: number): void {
  place(point, lerp(point.x, x, share), lerp(point.y, y, share), lerp(point.z, z, share));
}

function bightAngle(angle: number): number {
  const { catch: caught, farSide, castOffStart, tightenStart } = LOOP_TIMING;
  if (angle < caught) return 0;
  if (angle < farSide) return hookRotation(angle);
  if (angle < castOffStart) return HALF_TURN;
  return HALF_TURN + HALF_TURN * smoothstep(angle, castOffStart, tightenStart);
}

export function tightenShare(angle: number): number {
  const normalized = wrapPhase(angle, STITCH_CYCLE);
  if (normalized < LOOP_TIMING.tightenStart) return 0;
  return smoothstep(normalized, LOOP_TIMING.tightenStart, LOOP_TIMING.end);
}

function placeHole(points: Point3[]): void {
  const spread = LOOP_GEOMETRY.strandSpread;
  place(points[LOOP_POINT.holeBottom], -spread, PLATE_BOTTOM, -BACK_OFFSET);
  place(points[LOOP_POINT.holeTop], -spread, FABRIC_TOP, -BACK_OFFSET);
}

function placeNeedleLeg(eye: number, points: Point3[]): void {
  const eyeBack = points[LOOP_POINT.eye];
  const top = points[LOOP_POINT.needleTop];
  const bottom = points[LOOP_POINT.needleBottom];
  const spread = LOOP_GEOMETRY.strandSpread;
  if (eye >= FABRIC_TOP) place(top, spread, FABRIC_TOP, -BACK_OFFSET);
  else copyPoint(top, eyeBack);
  if (eye > PLATE_BOTTOM) place(bottom, spread, PLATE_BOTTOM, -BACK_OFFSET);
  else copyPoint(bottom, eyeBack);
}

function writeSlack(eye: number, points: Point3[]): void {
  const eyeBack = points[LOOP_POINT.eye];
  for (let index = LOOP_POINT.needleTop; index < LOOP_POINT.holeTop; index++) {
    copyPoint(points[index], eyeBack);
  }
  const holeTop = points[LOOP_POINT.holeTop];
  if (eye >= FABRIC_TOP) copyPoint(holeTop, eyeBack);
  else place(holeTop, -LOOP_GEOMETRY.strandSpread, FABRIC_TOP, -BACK_OFFSET);
}

function writeBulge(angle: number, eye: number, points: Point3[]): void {
  const swell = smoothstep(angle, LOOP_TIMING.bulgeStart, LOOP_TIMING.catch);
  const radius = lerp(BACK_RADIUS, LOOP_GEOMETRY.catchRadius, swell);
  const shoulder = lerp(BACK_RADIUS, radius, BULGE.shoulder);
  const eyeBack = points[LOOP_POINT.eye];
  copyPoint(points[LOOP_POINT.needleTop], eyeBack);
  copyPoint(points[LOOP_POINT.needleBottom], eyeBack);
  place(points[LOOP_POINT.needleCorner], 0, eye + BULGE.corner, -BACK_OFFSET);
  placeOnHook(points[LOOP_POINT.bightLow], 0, shoulder, eye + BULGE.bightLow);
  placeOnHook(
    points[LOOP_POINT.bightMid],
    0,
    radius + LOOP_GEOMETRY.beakBulge * swell,
    eye + BULGE.bightMid,
  );
  placeOnHook(points[LOOP_POINT.bightHigh], 0, shoulder, eye + BULGE.bightHigh);
  place(points[LOOP_POINT.fabricCorner], 0, eye + BULGE.top, -BACK_OFFSET);
  placeHole(points);
}

function writeCarry(bight: number, eye: number, points: Point3[]): void {
  const open = smoothstep(bight, 0, LOOP_GEOMETRY.openingSweep);
  const { strandSpread, catchRadius, bightRadius, beakBulge, upperLevel, lowerLevel } =
    LOOP_GEOMETRY;
  const cornerZ = lerp(-BACK_OFFSET, CORNER_Z, open);
  const radius = lerp(catchRadius, bightRadius, open);
  const shoulder = lerp(CATCH_SHOULDER, bightRadius, open);
  placeNeedleLeg(eye, points);
  place(
    points[LOOP_POINT.needleCorner],
    strandSpread * open,
    lerp(eye + BULGE.corner, lowerLevel, open),
    cornerZ,
  );
  placeOnHook(
    points[LOOP_POINT.bightLow],
    bight,
    shoulder,
    lerp(eye + BULGE.bightLow, lowerLevel, open),
  );
  placeOnHook(
    points[LOOP_POINT.bightMid],
    bight,
    radius + beakBulge,
    lerp(eye + BULGE.bightMid, HOOK_POINT_HEIGHT, open),
  );
  placeOnHook(
    points[LOOP_POINT.bightHigh],
    bight,
    shoulder,
    lerp(eye + BULGE.bightHigh, upperLevel, open),
  );
  place(
    points[LOOP_POINT.fabricCorner],
    -strandSpread * open,
    lerp(eye + BULGE.top, upperLevel, open),
    cornerZ,
  );
  placeHole(points);
}

function writeTighten(angle: number, eye: number, tension: Tension, points: Point3[]): void {
  writeCarry(STITCH_CYCLE, eye, points);
  const share = tightenShare(angle);
  const { topLevel, topDip } = stitchProfile(tension);
  const spread = LOOP_GEOMETRY.rowSpread;
  lerpPoint(points[LOOP_POINT.needleTop], spread, topLevel, 0, share);
  for (let index = LOOP_POINT.needleBottom; index < LOOP_POINT.holeTop; index++) {
    lerpPoint(points[index], 0, topDip, 0, share);
  }
  lerpPoint(points[LOOP_POINT.holeTop], -spread, topLevel, 0, share);
}

export function createLoopPoints(): Point3[] {
  return Array.from({ length: LOOP_POINT_COUNT }, () => ({ x: 0, y: 0, z: 0 }));
}

export function writeLoopPoints(angle: number, tension: Tension, points: Point3[]): void {
  const normalized = wrapPhase(angle, STITCH_CYCLE);
  const eye = needleEyeHeight(normalized);
  place(points[LOOP_POINT.eye], 0, eye, -BACK_OFFSET);
  if (normalized < LOOP_TIMING.bulgeStart) writeSlack(eye, points);
  else if (normalized < LOOP_TIMING.catch) writeBulge(normalized, eye, points);
  else if (normalized < LOOP_TIMING.tightenStart) writeCarry(bightAngle(normalized), eye, points);
  else writeTighten(normalized, eye, tension, points);
}

const scratch = createLoopPoints();
const PEAK_SAMPLE_DEGREES = 1;

function distance(from: Point3, to: Point3): number {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

function strandLength(points: readonly Point3[]): number {
  let length = 0;
  for (let index = LOOP_POINT.needleTop; index < LOOP_POINT.holeBottom; index++) {
    length += distance(points[index], points[index + 1]);
  }
  return length;
}

export function loopLength(angle: number, tension: Tension): number {
  writeLoopPoints(angle, tension, scratch);
  const direct = distance(scratch[LOOP_POINT.needleTop], scratch[LOOP_POINT.holeBottom]);
  return Math.max(0, strandLength(scratch) - direct);
}

function peakLength(): number {
  const { bulgeStart, castOffStart } = LOOP_TIMING;
  let peak = 0;
  for (let angle = bulgeStart; angle <= castOffStart; angle += PEAK_SAMPLE_DEGREES) {
    peak = Math.max(peak, loopLength(angle, 'balanced'));
  }
  return peak;
}

export const LOOP_PEAK_LENGTH = peakLength();

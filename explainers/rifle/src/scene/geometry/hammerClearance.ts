import { BOLT_BODY, FIRING_PIN, HAMMER_SHAPE } from '../constants';

type Planar = readonly [x: number, y: number];

const HEAD_PROBES: readonly Planar[] = [
  [HAMMER_SHAPE.face, HAMMER_SHAPE.length + 1.5],
  [HAMMER_SHAPE.face, HAMMER_SHAPE.length - 3.5],
  [-5, HAMMER_SHAPE.length + 1.5],
];

const STRUCK_FACE_X = HAMMER_SHAPE.pivot[0] + HAMMER_SHAPE.face;
const PIN_TAIL_X = BOLT_BODY.rear - FIRING_PIN.tail;

function toWorld([x, y]: Planar, angle: number): Planar {
  const [pivotX, pivotY] = HAMMER_SHAPE.pivot;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [pivotX + x * cos - y * sin, pivotY + x * sin + y * cos];
}

function insideBolt([x, y]: Planar, travel: number): boolean {
  const rear = STRUCK_FACE_X - travel + HAMMER_SHAPE.clearance;
  const reach = BOLT_BODY.radius + HAMMER_SHAPE.clearance;
  return x > rear && x < -travel && Math.abs(y) < reach;
}

function blocked(angle: number, travel: number): boolean {
  return HEAD_PROBES.some((probe) => insideBolt(toWorld(probe, angle), travel));
}

export function hammerAngle(modelAngle: number, travel: number): number {
  let angle = modelAngle;
  while (blocked(angle, travel) && angle < HAMMER_SHAPE.maxAngle) angle += HAMMER_SHAPE.step;
  return angle;
}

export function faceX(angle: number): number {
  return toWorld([HAMMER_SHAPE.face, HAMMER_SHAPE.length], angle)[0];
}

export function pinPush(angle: number, travel: number): number {
  if (travel > 0) return 0;
  return Math.min(FIRING_PIN.travel, Math.max(0, faceX(angle) - PIN_TAIL_X));
}

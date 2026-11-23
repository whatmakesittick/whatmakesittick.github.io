import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import { REST_FOOT, REST_JOINTS, REST_SOLE_Y } from './body';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

interface Arc {
  readonly radius: number;
  readonly from: number;
  readonly to: number;
  readonly start: Point2;
  readonly length: number;
}

export interface Contact {
  readonly point: Point2;
  readonly along: number;
  readonly piece: 'rear' | 'fore';
}

export const SHOE = {
  heelStackM: 0.034,
  foreStackM: 0.025,
  heelCentreShare: 0.12,
  foreCentreShare: 0.75,
  backRoomM: 0.006,
  toeRoomM: 0.015,
  heelBackMarginM: 0.02,
  toeMarginM: 0.02,
  heelRadiusM: 0.05,
  midRadiusM: 2,
  toeRadiusM: 0.15,
  heelWidthM: 0.09,
  foreWidthM: 0.115,
} as const;

const HALF_TURN = Math.PI / 2;

const ankle = new Vector3(...REST_JOINTS.ankle);
const ballOffset = new Vector3(...REST_JOINTS.ball).sub(ankle);
const forward = new Vector3(ballOffset.x, 0, ballOffset.z).normalize();
const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));

export const TOE_OUT_RAD = Math.atan2(forward.z, forward.x);

export function footLocal(point: Vector3): Vector3 {
  const offset = point.clone().sub(ankle);
  return new Vector3(offset.dot(forward), offset.y, offset.dot(right));
}

function localDirection(direction: readonly [number, number, number]): Vector3 {
  const vector = new Vector3(...direction);
  return new Vector3(vector.dot(forward), vector.y, vector.dot(right)).normalize();
}

const bareSole = REST_SOLE_Y - REST_JOINTS.ankle[1];
const bareBall = footLocal(new Vector3(...REST_JOINTS.ball));
const bareHeelBack = footLocal(new Vector3(...REST_FOOT.heelBack)).x;
const bareToeTip = footLocal(new Vector3(...REST_FOOT.toeTip)).x;
const insideBack = bareHeelBack - SHOE.backRoomM;
const insideLength = bareToeTip + SHOE.toeRoomM - insideBack;
const heelCentre = insideBack + SHOE.heelCentreShare * insideLength;
const foreCentre = insideBack + SHOE.foreCentreShare * insideLength;

export const DROP_RAD = Math.asin((SHOE.heelStackM - SHOE.foreStackM) / (foreCentre - heelCentre));

export function outsoleFromBare(point: Point2): Point2 {
  const cos = Math.cos(DROP_RAD);
  const sin = Math.sin(DROP_RAD);
  return { x: point.x * cos + point.y * sin, y: -point.x * sin + point.y * cos };
}

export const BARE_BALL = bareBall;
export const BARE_TOE_AXIS = localDirection(REST_FOOT.toeAxis);
export const BARE_TOE_BEND_AXIS = localDirection(REST_FOOT.toeBendAxis);

const soleLevel = outsoleFromBare({ x: heelCentre, y: bareSole }).y - SHOE.heelStackM;
const heelX = outsoleFromBare({ x: heelCentre, y: bareSole }).x;
const flexX = outsoleFromBare({ x: bareBall.x, y: bareSole }).x;
const tipX = outsoleFromBare({ x: bareToeTip + SHOE.toeMarginM, y: bareSole }).x;
const backX = outsoleFromBare({ x: bareHeelBack - SHOE.heelBackMarginM, y: bareSole }).x;

export const BALL_PIVOT: Point2 = outsoleFromBare({ x: bareBall.x, y: bareBall.y });

function arcEnd(arc: Arc): Point2 {
  return pointOn(arc, arc.to);
}

function pointOn(arc: Arc, angle: number): Point2 {
  return {
    x: arc.start.x + arc.radius * (Math.sin(angle) - Math.sin(arc.from)),
    y: arc.start.y + arc.radius * (Math.cos(arc.from) - Math.cos(angle)),
  };
}

function arc(radius: number, from: number, to: number, start: Point2): Arc {
  return { radius, from, to, start, length: radius * (to - from) };
}

function buildProfile(): { rear: Arc[]; fore: Arc[] } {
  const midHalf = (flexX - heelX) / SHOE.midRadiusM / 2;
  const midLowest: Point2 = { x: (heelX + flexX) / 2, y: soleLevel };
  const mid = arc(SHOE.midRadiusM, -midHalf, midHalf, {
    x: midLowest.x - SHOE.midRadiusM * Math.sin(midHalf),
    y: midLowest.y + SHOE.midRadiusM * (1 - Math.cos(midHalf)),
  });
  const heelSine = (backX - mid.start.x) / SHOE.heelRadiusM + Math.sin(-midHalf);
  const heelFrom = Math.asin(Math.max(heelSine, -1));
  const heelStart: Point2 = {
    x: mid.start.x - SHOE.heelRadiusM * (Math.sin(-midHalf) - Math.sin(heelFrom)),
    y: mid.start.y - SHOE.heelRadiusM * (Math.cos(heelFrom) - Math.cos(-midHalf)),
  };
  const heel = arc(SHOE.heelRadiusM, heelFrom, -midHalf, heelStart);
  const heelCorner = arc(0, -HALF_TURN, heelFrom, heelStart);
  const toeTo = Math.asin((tipX - flexX) / SHOE.toeRadiusM + Math.sin(midHalf));
  const toe = arc(SHOE.toeRadiusM, midHalf, toeTo, arcEnd(mid));
  const toeCorner = arc(0, toeTo, HALF_TURN, arcEnd(toe));
  return { rear: [heelCorner, heel, mid], fore: [toe, toeCorner] };
}

export const PROFILE = buildProfile();

const REAR_LENGTH = PROFILE.rear.reduce((sum, item) => sum + item.length, 0);

export const FLEX_TANGENT_RAD = PROFILE.fore[0].from;

function contactOn(
  arcs: readonly Arc[],
  angle: number,
  offset: number,
): Contact['point'] & {
  along: number;
} {
  let along = offset;
  for (const item of arcs) {
    if (angle <= item.to || item === arcs[arcs.length - 1]) {
      const clamped = Math.min(Math.max(angle, item.from), item.to);
      const point = pointOn(item, clamped);
      return { ...point, along: along + item.radius * (clamped - item.from) };
    }
    along += item.length;
  }
  throw new Error('empty profile');
}

export function rearContact(tangent: number): Contact {
  const found = contactOn(PROFILE.rear, tangent, 0);
  return { point: { x: found.x, y: found.y }, along: found.along, piece: 'rear' };
}

export function foreContact(tangent: number): Contact {
  const found = contactOn(PROFILE.fore, tangent, REAR_LENGTH);
  return { point: { x: found.x, y: found.y }, along: found.along, piece: 'fore' };
}

export function profileSamples(step: number): { rear: Point2[]; fore: Point2[] } {
  const sample = (arcs: readonly Arc[]): Point2[] =>
    arcs.flatMap((item) => {
      if (item.radius === 0) return [item.start];
      const count = Math.max(1, Math.ceil(item.length / step));
      return Array.from({ length: count + 1 }, (_, i) =>
        pointOn(item, item.from + ((item.to - item.from) * i) / count),
      );
    });
  return { rear: sample(PROFILE.rear), fore: sample(PROFILE.fore) };
}

export const SOLE_LEVEL_M = soleLevel;
export const TOE_BEND_MAX_RAD = toRadians(32);

import { clamp } from '@core/math';
import type { ActionPose, ChaseTarget, Point } from '../ids';
import {
  DAMPER,
  HAMMER,
  KEY,
  KEY_LEVER,
  SHANK,
  STRING_Y,
  UPRIGHT,
  WIPPEN,
  hammerAngleForRise,
  headTopOffset,
  keyX,
  mm,
} from '../model';

export const JACK_ESCAPE_ANGLE = 0.2;
export const REPETITION_TRAVEL_ANGLE = 0.06;

type HeadPose = Pick<ActionPose, 'hammerRiseMm' | 'shiftMm'>;
type DamperPose = Pick<ActionPose, 'damperLiftMm' | 'shiftMm'>;

function safeAsin(value: number): number {
  return Math.asin(clamp(value, -1, 1));
}

export function keyAngle(keyMm: number): number {
  return safeAsin(mm(keyMm) / KEY_LEVER.frontArm);
}

export function capstanRiseMm(keyMm: number): number {
  return (keyMm * KEY_LEVER.capstanArm) / KEY_LEVER.frontArm;
}

export function wippenAngle(keyMm: number): number {
  return -safeAsin(mm(capstanRiseMm(keyMm)) / WIPPEN.capstanArm);
}

export function jackRiseMm(keyMm: number): number {
  return (capstanRiseMm(keyMm) * WIPPEN.jackArm) / WIPPEN.capstanArm;
}

export function hammerAngle(riseMm: number): number {
  return hammerAngleForRise(riseMm);
}

export function jackAngle(escape: number): number {
  return escape * JACK_ESCAPE_ANGLE;
}

export function repetitionAngle(lift: number): number {
  return (lift - 1) * REPETITION_TRAVEL_ANGLE;
}

export function playedX(key: number, shiftMm: number): number {
  return keyX(key) + mm(shiftMm);
}

export function keyFrontTop(key: number, pose: Pick<ActionPose, 'keyMm' | 'shiftMm'>): Point {
  return [playedX(key, pose.shiftMm), KEY.top - mm(pose.keyMm), KEY.frontZ];
}

export function hammerHeadTop(key: number, pose: HeadPose): Point {
  const [y, z] = headTopOffset(hammerAngle(pose.hammerRiseMm));
  return [playedX(key, pose.shiftMm), HAMMER.pivotY + y, HAMMER.pivotZ + z];
}

export function damperHeadTop(key: number, pose: DamperPose): Point {
  return [
    playedX(key, pose.shiftMm),
    STRING_Y + DAMPER.headHeight + mm(pose.damperLiftMm),
    DAMPER.z,
  ];
}

export function uprightHammerAngle(travelMm: number): number {
  return -safeAsin(mm(travelMm) / UPRIGHT.shank);
}

export function chaseTargetFor(key: number, pose: HeadPose): ChaseTarget {
  return {
    position: hammerHeadTop(key, pose),
    heading: 0,
    pitch: 0,
    roll: 0,
    span: SHANK,
  };
}

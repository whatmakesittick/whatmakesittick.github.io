import type { Object3D } from 'three';
import { clamp, lerp } from '@core/math';
import type { Point } from '../../../ids';
import { MOTION } from '../../constants';
import { seaHeightAt } from './waves';

export interface Motion {
  heave: number;
  pitch: number;
  roll: number;
}

export interface MotionSpan {
  bow: number;
  stern: number;
  side: number;
}

export const BOAT_SPAN: MotionSpan = { bow: MOTION.bow, stern: MOTION.stern, side: MOTION.side };
export const SHIP_SPAN: MotionSpan = {
  bow: MOTION.shipEnd,
  stern: MOTION.shipEnd,
  side: MOTION.shipSide,
};

export function applyMotion(body: Object3D, motion: Motion): void {
  body.position.y = motion.heave;
  body.rotation.set(motion.roll, 0, motion.pitch, 'ZXY');
}

export function waveMotion(
  position: Point,
  heading: number,
  response: number,
  span: MotionSpan = BOAT_SPAN,
): Motion {
  const ahead = [Math.cos(heading), Math.sin(heading)];
  const starboard = [-Math.sin(heading), Math.cos(heading)];
  const sample = (along: number, across: number) =>
    seaHeightAt(
      position[0] + ahead[0] * along + starboard[0] * across,
      position[2] + ahead[1] * along + starboard[1] * across,
    );
  const bow = sample(span.bow, 0);
  const stern = sample(-span.stern, 0);
  const port = sample(0, -span.side);
  const right = sample(0, span.side);
  return {
    heave: ((bow + stern + port + right) / 4) * lerp(1, response, MOTION.heaveDamping),
    pitch: clamp(
      Math.atan2(bow - stern, span.bow + span.stern) * response,
      -MOTION.maxPitch,
      MOTION.maxPitch,
    ),
    roll: clamp(
      -Math.atan2(right - port, 2 * span.side) * response,
      -MOTION.maxRoll,
      MOTION.maxRoll,
    ),
  };
}

export function responseFor(liftShare: number): number {
  return lerp(1, MOTION.planedResponse, clamp(liftShare, 0, 1));
}

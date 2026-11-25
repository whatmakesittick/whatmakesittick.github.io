import type { Quaternion } from 'three';
import { Vector3 } from 'three';
import type { SideId } from '../../ids';
import { Y_AXIS, Z_AXIS, about, apply, mirrorPoint } from './frames';
import {
  BALL_PIVOT,
  FLEX_TANGENT_RAD,
  SHOE,
  TOE_BEND_MAX_RAD,
  foreContact,
  profileSamples,
  rearContact,
} from './shoe';
import type { Point2 } from './shoe';

const FLAT_FOOT_PITCH_RAD = -FLEX_TANGENT_RAD;
const SAMPLE_STEP_M = 0.01;
const SAMPLES = profileSamples(SAMPLE_STEP_M);
const CONTACT_DEPTH_M = 0.004;

interface PlantedFoot {
  readonly offset: Vector3;
  readonly along: number;
  readonly rotation: Quaternion;
  readonly toe: number;
}

function toeBendFor(pitch: number): number {
  if (pitch >= FLAT_FOOT_PITCH_RAD) return 0;
  return TOE_BEND_MAX_RAD * (1 - Math.exp(-(FLAT_FOOT_PITCH_RAD - pitch) / TOE_BEND_MAX_RAD));
}

function rotate(point: Point2, angle: number): Point2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function footRotation(yaw: number, pitch: number): Quaternion {
  return about(Y_AXIS, yaw).multiply(about(Z_AXIS, pitch));
}

export function plantFoot(yaw: number, pitch: number): PlantedFoot {
  const toe = toeBendFor(pitch);
  const heading = about(Y_AXIS, yaw);
  if (pitch >= FLAT_FOOT_PITCH_RAD) {
    const contact = rearContact(-pitch);
    const turned = rotate(contact.point, pitch);
    return {
      offset: apply(heading, -turned.x, -turned.y, 0),
      along: contact.along,
      rotation: footRotation(yaw, pitch),
      toe,
    };
  }
  const forePitch = pitch + toe;
  const contact = foreContact(-forePitch);
  const pivot = rotate(BALL_PIVOT, pitch);
  const tip = rotate(
    { x: contact.point.x - BALL_PIVOT.x, y: contact.point.y - BALL_PIVOT.y },
    forePitch,
  );
  return {
    offset: apply(heading, -(pivot.x + tip.x), -(pivot.y + tip.y), 0),
    along: contact.along,
    rotation: footRotation(yaw, pitch),
    toe,
  };
}

function lateralOffsets(): readonly number[] {
  return [0, SHOE.foreWidthM / 2, -SHOE.foreWidthM / 2];
}

export function solePoints(
  ankle: Vector3,
  rotation: Quaternion,
  toe: number,
  side: SideId,
): Vector3[] {
  const fore = rotation.clone().multiply(about(Z_AXIS, toe));
  const pivot = apply(rotation, BALL_PIVOT.x, BALL_PIVOT.y, 0).add(ankle);
  const points: Vector3[] = [];
  lateralOffsets().forEach((lateral) => {
    const z = mirrorPoint(new Vector3(0, 0, lateral), side).z;
    SAMPLES.rear.forEach((p) => points.push(apply(rotation, p.x, p.y, z).add(ankle)));
    SAMPLES.fore.forEach((p) =>
      points.push(apply(fore, p.x - BALL_PIVOT.x, p.y - BALL_PIVOT.y, z).add(pivot)),
    );
  });
  return points;
}

export function contactCentre(
  ankle: Vector3,
  rotation: Quaternion,
  toe: number,
  side: SideId,
): Vector3 {
  const points = solePoints(ankle, rotation, toe, side);
  const lowest = points.reduce((low, p) => Math.min(low, p.y), Infinity);
  const centre = new Vector3();
  let total = 0;
  points.forEach((p) => {
    const weight = Math.exp(-(p.y - lowest) / CONTACT_DEPTH_M);
    centre.addScaledVector(p, weight);
    total += weight;
  });
  return centre.divideScalar(total).setY(lowest);
}

export function lowestSole(
  ankle: Vector3,
  rotation: Quaternion,
  toe: number,
  side: SideId,
): Vector3 {
  return solePoints(ankle, rotation, toe, side).reduce((best, p) => (p.y < best.y ? p : best));
}

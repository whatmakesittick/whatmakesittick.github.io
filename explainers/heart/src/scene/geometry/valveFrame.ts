import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import type { Vec3 } from './field';

export interface RingFrame {
  readonly centre: Vector3;
  readonly normal: Vector3;
  readonly across: Vector3;
  readonly along: Vector3;
  readonly radius: number;
}

export type AnnulusLift = (angle: number) => number;

export interface RingTubeSpec {
  readonly segments: number;
  readonly radialSegments: number;
  readonly tubeRadius: number;
}

const XYZ = 3;
const FULL_TURN = Math.PI * 2;

export const FLAT: AnnulusLift = () => 0;

export function ringFrame(centre: Vec3, normal: Vec3, radius: number): RingFrame {
  const flow = new Vector3(...normal).normalize();
  const reference = Math.abs(flow.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
  const across = reference.addScaledVector(flow, -reference.dot(flow)).normalize();
  const along = new Vector3().crossVectors(flow, across).normalize();
  return { centre: new Vector3(...centre), normal: flow, across, along, radius };
}

export function planDirection(frame: RingFrame, angle: number, out = new Vector3()): Vector3 {
  return out
    .copy(frame.across)
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(frame.along, Math.sin(angle));
}

export function planAngle(frame: RingFrame, point: Vec3): number {
  const offset = new Vector3(...point).sub(frame.centre);
  return Math.atan2(offset.dot(frame.along), offset.dot(frame.across));
}

export function annulusPoint(
  frame: RingFrame,
  lift: AnnulusLift,
  angle: number,
  out = new Vector3(),
): Vector3 {
  return planDirection(frame, angle, out)
    .multiplyScalar(frame.radius)
    .add(frame.centre)
    .addScaledVector(frame.normal, -lift(angle));
}

export function saddle(amplitude: number, peakAngle: number): AnnulusLift {
  return (angle) => amplitude * Math.cos(2 * (angle - peakAngle));
}

export function ringTube(frame: RingFrame, lift: AnnulusLift, spec: RingTubeSpec): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  const centre = new Vector3();
  const ahead = new Vector3();
  const outward = new Vector3();
  const side = new Vector3();
  const direction = new Vector3();
  const tangent = new Vector3();
  const step = FULL_TURN / spec.segments;
  for (let segment = 0; segment <= spec.segments; segment += 1) {
    const angle = segment * step;
    annulusPoint(frame, lift, angle, centre);
    annulusPoint(frame, lift, angle + step / 2, ahead);
    tangent.subVectors(ahead, annulusPoint(frame, lift, angle - step / 2)).normalize();
    side.copy(frame.normal).addScaledVector(tangent, -frame.normal.dot(tangent)).normalize();
    outward.crossVectors(tangent, side).normalize();
    for (let around = 0; around <= spec.radialSegments; around += 1) {
      const turn = (around / spec.radialSegments) * FULL_TURN;
      direction.copy(outward).multiplyScalar(Math.cos(turn)).addScaledVector(side, Math.sin(turn));
      positions.push(
        centre.x + direction.x * spec.tubeRadius,
        centre.y + direction.y * spec.tubeRadius,
        centre.z + direction.z * spec.tubeRadius,
      );
      normals.push(direction.x, direction.y, direction.z);
    }
  }
  const stride = spec.radialSegments + 1;
  for (let segment = 0; segment < spec.segments; segment += 1) {
    for (let around = 0; around < spec.radialSegments; around += 1) {
      const a = segment * stride + around;
      const b = a + stride;
      index.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), XYZ));
  geometry.setIndex(index);
  return geometry;
}

export function sheetIndex(columns: number, rows: number): number[] {
  const index: number[] = [];
  const stride = rows + 1;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = column * stride + row;
      const b = a + stride;
      index.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  return index;
}

export function ease(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

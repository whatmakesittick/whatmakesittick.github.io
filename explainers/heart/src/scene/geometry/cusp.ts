import { Vector3 } from 'three';
import { ease, planDirection, sheetIndex } from './valveFrame';
import type { AnnulusLift, RingFrame } from './valveFrame';

export interface CuspShape {
  readonly count: number;
  readonly firstCommissure: number;
  readonly columns: number;
  readonly rows: number;
  readonly commissureHeightMm: number;
  readonly meetHeightMm: number;
  readonly edgeSagMm: number;
  readonly bellyMm: number;
  readonly wallInsetMm: number;
  readonly openBellyMm: number;
}

export interface CuspValve {
  readonly frame: RingFrame;
  readonly shape: CuspShape;
}

const XYZ = 3;

export function cuspSpan(shape: CuspShape): number {
  return (Math.PI * 2) / shape.count;
}

function cuspShare(shape: CuspShape, angle: number): number {
  const span = cuspSpan(shape);
  const turn = (((angle - shape.firstCommissure) % span) + span) % span;
  return turn / span;
}

export function crownHeight(shape: CuspShape, angle: number): number {
  return shape.commissureHeightMm * (1 - Math.sin(Math.PI * cuspShare(shape, angle)));
}

export function crownLift(shape: CuspShape): AnnulusLift {
  return (angle) => -crownHeight(shape, angle);
}

function downstream(frame: RingFrame, angle: number, radius: number, height: number): Vector3 {
  return planDirection(frame, angle)
    .multiplyScalar(radius)
    .add(frame.centre)
    .addScaledVector(frame.normal, height);
}

export function cuspPoint(
  valve: CuspValve,
  cusp: number,
  share: number,
  row: number,
  opening: number,
  out = new Vector3(),
): Vector3 {
  const { frame, shape } = valve;
  const span = cuspSpan(shape);
  const from = shape.firstCommissure + cusp * span;
  const angle = from + share * span;
  const depth = row / shape.rows;
  const hinge = downstream(frame, angle, frame.radius, crownHeight(shape, angle));
  const corner = share < 0.5 ? from : from + span;
  const toCentre = share < 0.5 ? share * 2 : 2 - share * 2;
  const top = downstream(frame, corner, frame.radius, shape.commissureHeightMm);
  const meet = frame.centre.clone().addScaledVector(frame.normal, shape.meetHeightMm);
  const shut = top
    .lerp(meet, toCentre)
    .addScaledVector(frame.normal, -shape.edgeSagMm * Math.sin(Math.PI * toCentre));
  const open = downstream(frame, angle, frame.radius - shape.wallInsetMm, shape.commissureHeightMm);
  const amount = ease(opening);
  const edge = shut.lerp(open, amount);
  const bulge = Math.sin(Math.PI * depth) * Math.sin(Math.PI * share);
  const inward = planDirection(frame, angle).negate();
  return out
    .copy(hinge)
    .lerp(edge, depth)
    .addScaledVector(frame.normal, -shape.bellyMm * bulge * (1 - amount))
    .addScaledVector(inward, -shape.openBellyMm * bulge * amount);
}

export function cuspVertexCount(shape: CuspShape): number {
  return (shape.columns + 1) * (shape.rows + 1);
}

export function cuspIndex(shape: CuspShape): number[] {
  return sheetIndex(shape.columns, shape.rows);
}

export function writeCusp(
  valve: CuspValve,
  cusp: number,
  opening: number,
  target: Float32Array,
): void {
  const { shape } = valve;
  const point = new Vector3();
  let offset = 0;
  for (let column = 0; column <= shape.columns; column += 1) {
    for (let row = 0; row <= shape.rows; row += 1) {
      cuspPoint(valve, cusp, column / shape.columns, row, opening, point);
      target[offset] = point.x;
      target[offset + 1] = point.y;
      target[offset + 2] = point.z;
      offset += XYZ;
    }
  }
}

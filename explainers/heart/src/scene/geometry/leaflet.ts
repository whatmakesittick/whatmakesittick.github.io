import { Vector3 } from 'three';
import type { Vec3 } from './field';

export interface RingFrame {
  readonly centre: Vector3;
  readonly normal: Vector3;
  readonly across: Vector3;
  readonly along: Vector3;
  readonly radius: number;
}

export interface LeafletSpec {
  readonly from: number;
  readonly to: number;
}

export interface LeafletShape {
  readonly kind: 'flap' | 'cusp';
  readonly columns: number;
  readonly rows: number;
  readonly coaptationDepth: number;
  readonly belly: number;
  readonly openTilt: number;
  readonly openBulge: number;
  readonly edgeRise: number;
  readonly commissureHeight: number;
  readonly wallInset: number;
}

const XYZ = 3;

export function ringFrame(centre: Vec3, normal: Vec3, radius: number): RingFrame {
  const flow = new Vector3(...normal).normalize();
  const reference = Math.abs(flow.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
  const across = reference.addScaledVector(flow, -reference.dot(flow)).normalize();
  const along = new Vector3().crossVectors(flow, across).normalize();
  return { centre: new Vector3(...centre), normal: flow, across, along, radius };
}

export function ringPoint(frame: RingFrame, angle: number, out = new Vector3()): Vector3 {
  return out
    .copy(frame.centre)
    .addScaledVector(frame.across, frame.radius * Math.cos(angle))
    .addScaledVector(frame.along, frame.radius * Math.sin(angle));
}

export function freeEdgePoint(
  frame: RingFrame,
  leaflet: LeafletSpec,
  shape: LeafletShape,
  share: number,
  out = new Vector3(),
): Vector3 {
  const corner = share < 0.5 ? leaflet.from : leaflet.to;
  const toCentre = share < 0.5 ? share * 2 : 2 - share * 2;
  const meet = frame.centre
    .clone()
    .addScaledVector(frame.normal, shape.coaptationDepth + shape.edgeRise);
  ringPoint(frame, corner, out).addScaledVector(
    frame.normal,
    shape.kind === 'cusp' ? shape.commissureHeight : 0,
  );
  return out.lerp(meet, toCentre);
}

function ease(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function leafletVertexCount(shape: LeafletShape): number {
  return (shape.columns + 1) * (shape.rows + 1);
}

export function leafletIndex(shape: LeafletShape): number[] {
  const index: number[] = [];
  const stride = shape.rows + 1;
  for (let column = 0; column < shape.columns; column += 1) {
    for (let row = 0; row < shape.rows; row += 1) {
      const a = column * stride + row;
      const b = a + stride;
      index.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  return index;
}

function cuspPoint(
  frame: RingFrame,
  leaflet: LeafletSpec,
  shape: LeafletShape,
  opening: number,
  share: number,
  depth: number,
  out: Vector3,
): Vector3 {
  const angle = leaflet.from + share * (leaflet.to - leaflet.from);
  const rise = shape.commissureHeight;
  const hinge = ringPoint(frame, angle).addScaledVector(
    frame.normal,
    rise * (1 - Math.sin(Math.PI * share)),
  );
  const corner = share < 0.5 ? leaflet.from : leaflet.to;
  const toCentre = share < 0.5 ? share * 2 : 2 - share * 2;
  const meet = frame.centre.clone().addScaledVector(frame.normal, shape.coaptationDepth);
  const shut = ringPoint(frame, corner).addScaledVector(frame.normal, rise).lerp(meet, toCentre);
  const inward = frame.centre.clone().sub(ringPoint(frame, angle)).normalize();
  const open = ringPoint(frame, angle)
    .addScaledVector(frame.normal, rise)
    .addScaledVector(inward, shape.wallInset);
  const swing = ease(opening);
  const edge = shut.lerp(open, swing);
  const bulge = Math.sin(Math.PI * depth) * Math.sin(Math.PI * share);
  return out
    .copy(hinge)
    .lerp(edge, depth)
    .addScaledVector(frame.normal, -shape.belly * bulge * (1 - swing))
    .addScaledVector(inward, -shape.openBulge * bulge * swing);
}

export function leafletPoint(
  frame: RingFrame,
  leaflet: LeafletSpec,
  shape: LeafletShape,
  opening: number,
  share: number,
  depth: number,
  out = new Vector3(),
): Vector3 {
  if (shape.kind === 'cusp') return cuspPoint(frame, leaflet, shape, opening, share, depth, out);
  const angle = leaflet.from + share * (leaflet.to - leaflet.from);
  const base = ringPoint(frame, angle);
  const edge = freeEdgePoint(frame, leaflet, shape, share);
  const span = edge.distanceTo(base);
  const inward = frame.centre.clone().sub(base).normalize();
  const closed = span > 1e-6 ? edge.clone().sub(base).divideScalar(span) : inward.clone();
  const open = frame.normal
    .clone()
    .multiplyScalar(Math.cos(shape.openTilt))
    .addScaledVector(inward, Math.sin(shape.openTilt));
  const swing = ease(opening);
  const direction = closed.lerp(open, swing).normalize();
  const bulge = Math.sin(Math.PI * depth) * Math.sin(Math.PI * share);
  return out
    .copy(base)
    .addScaledVector(direction, span * depth)
    .addScaledVector(frame.normal, -shape.belly * bulge * (1 - swing))
    .addScaledVector(inward, -shape.openBulge * bulge * swing);
}

export function writeLeaflet(
  frame: RingFrame,
  leaflet: LeafletSpec,
  shape: LeafletShape,
  opening: number,
  target: Float32Array,
): void {
  const point = new Vector3();
  let offset = 0;
  for (let column = 0; column <= shape.columns; column += 1) {
    for (let row = 0; row <= shape.rows; row += 1) {
      leafletPoint(frame, leaflet, shape, opening, column / shape.columns, row / shape.rows, point);
      target[offset] = point.x;
      target[offset + 1] = point.y;
      target[offset + 2] = point.z;
      offset += XYZ;
    }
  }
}

export function evenLeaflets(count: number, startAngle: number): LeafletSpec[] {
  const span = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, index) => ({
    from: startAngle + index * span,
    to: startAngle + (index + 1) * span,
  }));
}

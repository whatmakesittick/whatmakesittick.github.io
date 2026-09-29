import { Vector3 } from 'three';
import { annulusPoint, ease, planDirection, sheetIndex } from './valveFrame';
import type { AnnulusLift, RingFrame } from './valveFrame';

export interface FlapSpec {
  readonly from: number;
  readonly to: number;
  readonly depthMm: number;
  readonly clefts: readonly number[];
}

export interface FlapShape {
  readonly columnsPerTurn: number;
  readonly minColumns: number;
  readonly rows: number;
  readonly lipRows: number;
  readonly commissureDepthMm: number;
  readonly commissureGap: number;
  readonly junction: readonly [across: number, along: number];
  readonly smile: number;
  readonly seamBend: number;
  readonly closedDropMm: number;
  readonly domeMm: number;
  readonly lipMm: number;
  readonly appositionMm: number;
  readonly openTilt: number;
  readonly openBellyMm: number;
  readonly tongue: number;
  readonly cleftDepth: number;
  readonly cleftWidth: number;
}

export interface FlapValve {
  readonly frame: RingFrame;
  readonly lift: AnnulusLift;
  readonly leaflets: readonly FlapSpec[];
  readonly shape: FlapShape;
}

interface Seam {
  readonly start: Vector3;
  readonly control: Vector3;
  readonly end: Vector3;
}

const XYZ = 3;
const SOLID_WEIGHT = 1e-6;
const FULL_TURN = Math.PI * 2;

function junctionPoint(valve: FlapValve): Vector3 {
  const { frame, shape } = valve;
  const [across, along] = shape.junction;
  return frame.centre
    .clone()
    .addScaledVector(frame.across, across * frame.radius)
    .addScaledVector(frame.along, along * frame.radius)
    .addScaledVector(frame.normal, shape.closedDropMm);
}

function bentMiddle(valve: FlapValve, start: Vector3, end: Vector3): Vector3 {
  const middle = start.clone().lerp(end, 0.5);
  const across = new Vector3().crossVectors(valve.frame.normal, end.clone().sub(start)).normalize();
  return middle.addScaledVector(across, valve.shape.seamBend * valve.frame.radius);
}

function commissure(valve: FlapValve, index: number): Vector3 {
  return annulusPoint(valve.frame, valve.lift, valve.leaflets[index].from);
}

export function seams(valve: FlapValve): Seam[] {
  const junction = junctionPoint(valve);
  const count = valve.leaflets.length;
  const starts = valve.leaflets.map((_, index) => commissure(valve, index));
  return starts.map((start, index) => {
    const other = starts[(index + 1) % count];
    const control =
      count === 2
        ? junction.clone().addScaledVector(start.clone().sub(other), valve.shape.smile)
        : bentMiddle(valve, start, junction);
    return { start, control, end: junction };
  });
}

function seamPoint(seam: Seam, share: number, out: Vector3): Vector3 {
  const rest = 1 - share;
  return out
    .copy(seam.start)
    .multiplyScalar(rest * rest)
    .addScaledVector(seam.control, 2 * rest * share)
    .addScaledVector(seam.end, share * share);
}

export function closedEdge(
  valve: FlapValve,
  all: readonly Seam[],
  leaflet: number,
  share: number,
  out = new Vector3(),
): Vector3 {
  const next = (leaflet + 1) % valve.leaflets.length;
  if (share < 0.5) return seamPoint(all[leaflet], share * 2, out);
  return seamPoint(all[next], 2 - share * 2, out);
}

export function hingeAngle(valve: FlapValve, leaflet: number, share: number): number {
  const { from, to } = valve.leaflets[leaflet];
  const gap = valve.shape.commissureGap / 2;
  return from + gap + share * (to - from - 2 * gap);
}

export function openDepth(spec: FlapSpec, shape: FlapShape, share: number): number {
  let depth = Math.pow(Math.sin(Math.PI * share), shape.tongue);
  for (const cleft of spec.clefts) {
    const offset = (share - cleft) / shape.cleftWidth;
    depth *= 1 - shape.cleftDepth * Math.exp(-offset * offset);
  }
  return shape.commissureDepthMm + (spec.depthMm - shape.commissureDepthMm) * depth;
}

interface ColumnFrame {
  readonly hinge: Vector3;
  readonly inward: Vector3;
  readonly closed: Vector3;
  readonly side: Vector3;
  readonly weight: number;
  readonly depth: number;
}

function columnFrame(
  valve: FlapValve,
  all: readonly Seam[],
  leaflet: number,
  share: number,
): ColumnFrame {
  const angle = hingeAngle(valve, leaflet, share);
  const hinge = annulusPoint(valve.frame, valve.lift, angle);
  const inward = planDirection(valve.frame, angle).negate();
  const closed = closedEdge(valve, all, leaflet, share);
  const side = hinge.clone().sub(closed);
  side.addScaledVector(valve.frame.normal, -side.dot(valve.frame.normal));
  if (side.lengthSq() > SOLID_WEIGHT) side.normalize();
  else side.copy(inward).negate();
  return {
    hinge,
    inward,
    closed,
    side,
    weight: Math.sin(Math.PI * share),
    depth: openDepth(valve.leaflets[leaflet], valve.shape, share),
  };
}

function closedPoint(valve: FlapValve, column: ColumnFrame, row: number, out: Vector3): Vector3 {
  const { shape, frame } = valve;
  const sheetRows = shape.rows - shape.lipRows;
  const apposition = column.side.clone().multiplyScalar(shape.appositionMm);
  if (row <= sheetRows) {
    const share = row / sheetRows;
    return out
      .copy(column.hinge)
      .lerp(column.closed, share)
      .addScaledVector(frame.normal, -shape.domeMm * Math.sin(Math.PI * share) * column.weight)
      .addScaledVector(apposition, ease((share - 0.6) / 0.4));
  }
  const lip = (row - sheetRows) / shape.lipRows;
  const lipLength = shape.lipMm * (0.4 + 0.6 * column.weight);
  return out
    .copy(column.closed)
    .add(apposition)
    .addScaledVector(frame.normal, lipLength * lip);
}

function openPoint(valve: FlapValve, column: ColumnFrame, row: number, out: Vector3): Vector3 {
  const { shape, frame } = valve;
  const share = row / shape.rows;
  const direction = frame.normal
    .clone()
    .multiplyScalar(Math.cos(shape.openTilt))
    .addScaledVector(column.inward, Math.sin(shape.openTilt));
  return out
    .copy(column.hinge)
    .addScaledVector(direction, column.depth * share)
    .addScaledVector(column.inward, -shape.openBellyMm * Math.sin(Math.PI * share) * column.weight);
}

function swing(
  hinge: Vector3,
  closed: Vector3,
  open: Vector3,
  amount: number,
  out: Vector3,
): Vector3 {
  const shut = closed.clone().sub(hinge);
  const wide = open.clone().sub(hinge);
  const length = shut.length() + (wide.length() - shut.length()) * amount;
  if (shut.lengthSq() < SOLID_WEIGHT || wide.lengthSq() < SOLID_WEIGHT) {
    return out.copy(closed).lerp(open, amount);
  }
  const direction = shut.normalize().lerp(wide.normalize(), amount);
  if (direction.lengthSq() < SOLID_WEIGHT) return out.copy(closed).lerp(open, amount);
  return out.copy(hinge).addScaledVector(direction.normalize(), length);
}

export function flapPoint(
  valve: FlapValve,
  leaflet: number,
  share: number,
  row: number,
  opening: number,
  out = new Vector3(),
): Vector3 {
  const all = seams(valve);
  const column = columnFrame(valve, all, leaflet, share);
  return columnPoint(valve, column, row, ease(opening), out);
}

function columnPoint(
  valve: FlapValve,
  column: ColumnFrame,
  row: number,
  amount: number,
  out: Vector3,
): Vector3 {
  const closed = closedPoint(valve, column, row, new Vector3());
  const open = openPoint(valve, column, row, new Vector3());
  return swing(column.hinge, closed, open, amount, out);
}

export function flapColumns(valve: FlapValve, leaflet: number): number {
  const { from, to } = valve.leaflets[leaflet];
  const share = (to - from) / FULL_TURN;
  return Math.max(valve.shape.minColumns, Math.round(share * valve.shape.columnsPerTurn));
}

export function flapVertexCount(valve: FlapValve, leaflet: number): number {
  return (flapColumns(valve, leaflet) + 1) * (valve.shape.rows + 1);
}

export function flapIndex(valve: FlapValve, leaflet: number): number[] {
  return sheetIndex(flapColumns(valve, leaflet), valve.shape.rows);
}

export function writeFlap(
  valve: FlapValve,
  leaflet: number,
  opening: number,
  target: Float32Array,
): void {
  const { shape } = valve;
  const all = seams(valve);
  const amount = ease(opening);
  const point = new Vector3();
  const columns = flapColumns(valve, leaflet);
  let offset = 0;
  for (let column = 0; column <= columns; column += 1) {
    const frame = columnFrame(valve, all, leaflet, column / columns);
    for (let row = 0; row <= shape.rows; row += 1) {
      columnPoint(valve, frame, row, amount, point);
      target[offset] = point.x;
      target[offset + 1] = point.y;
      target[offset + 2] = point.z;
      offset += XYZ;
    }
  }
}

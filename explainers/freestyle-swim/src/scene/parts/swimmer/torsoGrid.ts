import { BufferAttribute, BufferGeometry } from 'three';
import { FULL_TURN, lerp, wrapAngle } from '@core/math';
import { clampedCurve } from '../../rig/curve';
import { TORSO } from './shapes';
import type { TorsoDetail } from './shapes';
import { closeSeam, gridIndex } from './tube';

const XYZ = 3;

export interface TorsoGrid {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly xs: Float32Array;
  readonly ringSize: number;
}

function torsoChannel(axis: number, at: number): number {
  return clampedCurve(
    TORSO.stations.map((station) => [station[0], station[axis]] as const),
    at,
  );
}

function superellipse(value: number): number {
  return Math.sign(value) * Math.abs(value) ** (2 / TORSO.squareness);
}

function gauss(offset: number, spread: number): number {
  return Math.exp(-((offset / spread) ** 2));
}

function detailAmount(detail: TorsoDetail, x: number, angle: number): number {
  const along = gauss(x - detail.x, detail.spreadX);
  const near = gauss(wrapAngle(angle - detail.angle), detail.spreadAngle);
  const far = detail.paired
    ? gauss(wrapAngle(angle - (TORSO.mirror - detail.angle)), detail.spreadAngle)
    : 0;
  return detail.amount * along * (near + far);
}

function relief(x: number, angle: number): number {
  return 1 + TORSO.details.reduce((sum, detail) => sum + detailAmount(detail, x, angle), 0);
}

function ringPositions(x: number): number[] {
  const { segments } = TORSO;
  const [halfWidth, halfThickness, lift] = [1, 2, 3].map((axis) => torsoChannel(axis, x));
  const points: number[] = [];
  for (let step = 0; step <= segments; step++) {
    const angle = (step / segments) * FULL_TURN;
    const scale = relief(x, angle);
    points.push(
      x,
      lift + halfThickness * superellipse(Math.sin(angle)) * scale,
      halfWidth * superellipse(Math.cos(angle)) * scale,
    );
  }
  return points;
}

export function torsoGrid(): TorsoGrid {
  const { rings, segments, stations } = TORSO;
  const ringSize = segments + 1;
  const first = stations[0][0];
  const last = stations[stations.length - 1][0];
  const positions: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const x = lerp(first, last, 0.5 - 0.5 * Math.cos((Math.PI * ring) / rings));
    positions.push(...ringPositions(x));
  }
  const whole = new BufferGeometry();
  whole.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  whole.setIndex(gridIndex(ringSize, rings));
  whole.computeVertexNormals();
  const normals = whole.getAttribute('normal').array as Float32Array;
  closeSeam(normals, ringSize);
  const xs = new Float32Array(positions.filter((_, index) => index % XYZ === 0));
  whole.dispose();
  return { positions: new Float32Array(positions), normals, xs, ringSize };
}

export function torsoPiece(grid: TorsoGrid, fromRing: number, toRing: number): BufferGeometry {
  const start = fromRing * grid.ringSize * XYZ;
  const end = (toRing + 1) * grid.ringSize * XYZ;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(grid.positions.slice(start, end), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(grid.normals.slice(start, end), XYZ));
  geometry.setIndex(gridIndex(grid.ringSize, toRing - fromRing));
  return geometry;
}

export function ringAt(grid: TorsoGrid, x: number): number {
  const rings = grid.xs.length / grid.ringSize - 1;
  for (let ring = 0; ring <= rings; ring++) {
    if (grid.xs[ring * grid.ringSize] >= x) return ring;
  }
  return rings;
}

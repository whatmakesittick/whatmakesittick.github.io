import type { APose } from './apose.ts';
import { cross, dot, normalize, sub, type Vec } from './vec.ts';

const LIMB_RADIUS = 0.13;
const TORSO_HALF_WIDTH = 0.24;
const SCAN_STEPS = 12;

type Point = readonly [number, number];

export interface Girths {
  upperArm: number;
  forearm: number;
  wrist: number;
  chest: number;
  waist: number;
  thigh: number;
  calf: number;
}

function turn(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function halfHull(points: Point[]): Point[] {
  const hull: Point[] = [];
  for (const point of points) {
    while (hull.length >= 2 && turn(hull[hull.length - 2], hull[hull.length - 1], point) <= 0)
      hull.pop();
    hull.push(point);
  }
  hull.pop();
  return hull;
}

function hullPerimeter(points: Point[]): number {
  if (points.length < 3) return 0;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const hull = [...halfHull(sorted), ...halfHull(sorted.reverse())];
  return hull.reduce((sum, point, index) => {
    const next = hull[(index + 1) % hull.length];
    return sum + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);
}

function planeAxes(axis: Vec): [Vec, Vec] {
  const helper: Vec = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(axis, helper));
  return [u, cross(axis, u)];
}

function sliceGirth(aPose: APose, centre: Vec, axis: Vec, radius: number): number {
  const { positions, triangles } = aPose.shape;
  const body = new Set(aPose.bodyVertices);
  const [u, v] = planeAxes(axis);
  const offsetOf = (vertex: number): Vec =>
    sub([positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]], centre);
  const points: Point[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const corners = [triangles[i], triangles[i + 1], triangles[i + 2]];
    if (!corners.every((vertex) => body.has(vertex))) continue;
    const offsets = corners.map(offsetOf);
    const heights = offsets.map((offset) => dot(offset, axis));
    for (let k = 0; k < 3; k++) {
      const next = (k + 1) % 3;
      if (heights[k] > 0 === heights[next] > 0) continue;
      const share = heights[k] / (heights[k] - heights[next]);
      const [from, to] = [offsets[k], offsets[next]];
      const crossing: Vec = [0, 1, 2].map((c) => from[c] + (to[c] - from[c]) * share) as Vec;
      const point: Point = [dot(crossing, u), dot(crossing, v)];
      if (Math.hypot(point[0], point[1]) <= radius) points.push(point);
    }
  }
  return hullPerimeter(points);
}

function along(from: Vec, to: Vec, share: number): Vec {
  return [0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * share) as Vec;
}

function scan(from: number, to: number, measure: (share: number) => number): number[] {
  return Array.from({ length: SCAN_STEPS + 1 }, (_, step) =>
    measure(from + ((to - from) * step) / SCAN_STEPS),
  );
}

export function girths(aPose: APose): Girths {
  const { shoulder, elbow, wrist, hip, knee, ankle } = aPose.rest;
  const limb = (from: Vec, to: Vec) => (share: number) =>
    sliceGirth(aPose, along(from, to, share), normalize(sub(to, from)), LIMB_RADIUS);
  const torso = (share: number) =>
    sliceGirth(aPose, [share * hip[0], 0, 0], [1, 0, 0], TORSO_HALF_WIDTH);
  return {
    upperArm: Math.max(...scan(0.4, 0.6, limb(shoulder, elbow))),
    forearm: Math.max(...scan(0.1, 0.4, limb(elbow, wrist))),
    wrist: Math.min(...scan(0.85, 0.98, limb(elbow, wrist))),
    chest: Math.max(...scan(0.15, 0.35, torso)),
    waist: Math.min(...scan(0.55, 0.85, torso)),
    thigh: Math.max(...scan(0.25, 0.5, limb(hip, knee))),
    calf: Math.max(...scan(0.15, 0.45, limb(knee, ankle))),
  };
}

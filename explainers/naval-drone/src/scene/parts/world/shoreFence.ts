import { CylinderGeometry, Matrix4, PlaneGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../context';

type Spot = readonly [x: number, z: number];

interface Run {
  from: Spot;
  to: Spot;
}

interface Post {
  x: number;
  z: number;
  thick: boolean;
}

export const FENCE_LAYOUT = {
  half: [13, 9] as Spot,
  height: 2.4,
  mesh: [0.06, 2.34] as const,
  meshTile: 0.3,
  spacing: 3,
  gate: { x: [4, 8] as const, gap: 0.04 },
  post: { radius: 0.035, sink: 0.12, segments: 6, thick: 1.6 },
  rail: { radius: 0.022, segments: 6 },
} as const;

const UP = new Vector3(0, 1, 0);
const NO_TURN = new Quaternion();

function sideRuns(): Run[] {
  const [hx, hz] = FENCE_LAYOUT.half;
  const [gateWest, gateEast] = FENCE_LAYOUT.gate.x;
  return [
    { from: [-hx, -hz], to: [hx, -hz] },
    { from: [hx, -hz], to: [hx, hz] },
    { from: [hx, hz], to: [gateEast, hz] },
    { from: [gateWest, hz], to: [-hx, hz] },
    { from: [-hx, hz], to: [-hx, -hz] },
  ];
}

function gateRuns(): Run[] {
  const { gate, half } = FENCE_LAYOUT;
  const middle = (gate.x[0] + gate.x[1]) / 2;
  const z = half[1];
  return [
    { from: [gate.x[0] + gate.gap, z], to: [middle - gate.gap, z] },
    { from: [middle + gate.gap, z], to: [gate.x[1] - gate.gap, z] },
  ];
}

function runLength({ from, to }: Run): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

function runEnds(run: Run, height: number): [Vector3, Vector3] {
  return [new Vector3(run.from[0], height, run.from[1]), new Vector3(run.to[0], height, run.to[1])];
}

function posts(): Post[] {
  const { spacing, gate, half } = FENCE_LAYOUT;
  const along = sideRuns().flatMap((run) => {
    const steps = Math.max(1, Math.ceil(runLength(run) / spacing));
    return Array.from({ length: steps }, (_, step) => ({
      x: run.from[0] + ((run.to[0] - run.from[0]) * step) / steps,
      z: run.from[1] + ((run.to[1] - run.from[1]) * step) / steps,
      thick: step === 0,
    }));
  });
  return [...along, { x: gate.x[1], z: half[1], thick: true }];
}

function tube(from: Vector3, to: Vector3): BufferGeometry {
  const { radius, segments } = FENCE_LAYOUT.rail;
  const geometry = new CylinderGeometry(radius, radius, from.distanceTo(to), segments, 1, true);
  const direction = to.clone().sub(from).normalize();
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction));
  const middle = new Vector3().addVectors(from, to).divideScalar(2);
  return geometry.translate(middle.x, middle.y, middle.z);
}

function leafFrame(run: Run): BufferGeometry[] {
  const [topA, topB] = runEnds(run, FENCE_LAYOUT.height);
  const [lowA, lowB] = runEnds(run, FENCE_LAYOUT.mesh[0]);
  return [tube(topA, topB), tube(lowA, lowB), tube(lowA, topA), tube(lowB, topB), tube(lowA, topB)];
}

export function fenceRails(): BufferGeometry[] {
  const sides = sideRuns().map((run) => tube(...runEnds(run, FENCE_LAYOUT.height)));
  return [...sides, ...gateRuns().flatMap(leafFrame)];
}

function meshPanel(run: Run): BufferGeometry {
  const { mesh, meshTile } = FENCE_LAYOUT;
  const length = runLength(run);
  const [low, high] = mesh;
  const geometry = new PlaneGeometry(length, high - low);
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      (uv.getX(index) * length) / meshTile,
      (uv.getY(index) * (high - low)) / meshTile,
    );
  }
  geometry.rotateY(-Math.atan2(run.to[1] - run.from[1], run.to[0] - run.from[0]));
  return geometry.translate(
    (run.from[0] + run.to[0]) / 2,
    (low + high) / 2,
    (run.from[1] + run.to[1]) / 2,
  );
}

export function fencePanels(): BufferGeometry {
  return mergeParts([...sideRuns(), ...gateRuns()].map(meshPanel));
}

export function fencePost(): BufferGeometry {
  const { post, height } = FENCE_LAYOUT;
  const geometry = new CylinderGeometry(
    post.radius,
    post.radius,
    height + post.sink,
    post.segments,
  );
  return geometry.translate(0, (height - post.sink) / 2, 0);
}

export function fencePostMatrices(): Matrix4[] {
  const { thick } = FENCE_LAYOUT.post;
  return posts().map(({ x, z, thick: isThick }) => {
    const width = isThick ? thick : 1;
    return new Matrix4().compose(new Vector3(x, 0, z), NO_TURN, new Vector3(width, 1, width));
  });
}

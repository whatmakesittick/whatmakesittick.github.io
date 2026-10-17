import { Vector3 } from 'three';
import { FULL_TURN } from '@core/math';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../../parts/context';
import { RAMP_LENGTH } from '../../../model/layout';
import { framePoint, rampFrames } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { arrayGeometry } from './arrays';

export type CrossPoint = readonly [across: number, depth: number];

export interface Sweep {
  readonly frames: readonly RampFrame[];
  readonly arc: readonly number[];
}

export interface CrossRect {
  minAcross: number;
  maxAcross: number;
  minDepth: number;
  maxDepth: number;
}

interface Buffers {
  position: number[];
  normal: number[];
  uv: number[];
  indices: number[];
}

const point = new Vector3();
const direction = new Vector3();

function emptyBuffers(): Buffers {
  return { position: [], normal: [], uv: [], indices: [] };
}

function toGeometry({ indices, ...arrays }: Buffers): BufferGeometry {
  return arrayGeometry(arrays, indices);
}

function crossDirection(frame: RampFrame, across: number, depth: number): Vector3 {
  return direction
    .set(0, 0, 0)
    .addScaledVector(frame.side, across)
    .addScaledVector(frame.normal, depth);
}

function pushVertex(buffers: Buffers, at: Vector3, normal: Vector3, u: number, v: number): void {
  buffers.position.push(at.x, at.y, at.z);
  buffers.normal.push(normal.x, normal.y, normal.z);
  buffers.uv.push(u, v);
}

function pushGrid(buffers: Buffers, rows: number, columns: number): void {
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      buffers.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

export function rampSweep(sections: number, from = 0, to = RAMP_LENGTH): Sweep {
  const frames = rampFrames(sections, from, to);
  return { frames, arc: frames.map((frame) => frame.distance) };
}

export function sweepStrip(
  sweep: Sweep,
  from: CrossPoint,
  to: CrossPoint,
  uvLength: number,
): BufferGeometry {
  const buffers = emptyBuffers();
  const along = to[0] - from[0];
  const deep = to[1] - from[1];
  const length = Math.hypot(along, deep);
  sweep.frames.forEach((frame, index) => {
    const normal = crossDirection(frame, deep / length, -along / length).clone();
    const u = sweep.arc[index] / uvLength;
    pushVertex(buffers, framePoint(frame, from[0], from[1], point), normal, u, 0);
    pushVertex(buffers, framePoint(frame, to[0], to[1], point), normal, u, 1);
  });
  pushGrid(buffers, sweep.frames.length, 2);
  return toGeometry(buffers);
}

export function sweepLoop(
  sweep: Sweep,
  loop: readonly CrossPoint[],
  uvLength: number,
  closed = true,
): BufferGeometry {
  const edges = closed ? loop.length : loop.length - 1;
  return mergeParts(
    Array.from({ length: edges }, (_, index) =>
      sweepStrip(sweep, loop[index], loop[(index + 1) % loop.length], uvLength),
    ),
  );
}

export function rectLoop(rect: CrossRect): CrossPoint[] {
  const { minAcross, maxAcross, minDepth, maxDepth } = rect;
  return [
    [minAcross, minDepth],
    [maxAcross, minDepth],
    [maxAcross, maxDepth],
    [minAcross, maxDepth],
  ];
}

export function sweepTube(
  sweep: Sweep,
  centre: CrossPoint,
  radius: number,
  segments: number,
  uvLength: number,
): BufferGeometry {
  const buffers = emptyBuffers();
  sweep.frames.forEach((frame, index) => {
    for (let step = 0; step <= segments; step += 1) {
      const angle = (FULL_TURN * step) / segments;
      const normal = crossDirection(frame, Math.cos(angle), Math.sin(angle)).clone();
      const at = framePoint(frame, centre[0], centre[1], point).addScaledVector(normal, radius);
      pushVertex(buffers, at, normal, sweep.arc[index] / uvLength, step / segments);
    }
  });
  pushGrid(buffers, sweep.frames.length, segments + 1);
  return toGeometry(buffers);
}

function frameCap(
  frame: RampFrame,
  polygon: readonly CrossPoint[],
  facing: 1 | -1,
): BufferGeometry {
  const buffers = emptyBuffers();
  const normal = frame.tangent.clone().multiplyScalar(facing);
  const ordered = facing < 0 ? polygon : [...polygon].reverse();
  ordered.forEach(([across, depth]) =>
    pushVertex(buffers, framePoint(frame, across, depth, point), normal, across, depth),
  );
  for (let index = 1; index < ordered.length - 1; index += 1) {
    buffers.indices.push(0, index, index + 1);
  }
  return toGeometry(buffers);
}

export function endCaps(sweep: Sweep, loop: readonly CrossPoint[]): BufferGeometry[] {
  const { frames } = sweep;
  return [frameCap(frames[0], loop, -1), frameCap(frames[frames.length - 1], loop, 1)];
}

export function sweepCapped(
  sweep: Sweep,
  loop: readonly CrossPoint[],
  uvLength: number,
): BufferGeometry {
  return mergeParts([sweepLoop(sweep, loop, uvLength), ...endCaps(sweep, loop)]);
}

import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import type { RestFrame } from '../garments/restFrame';

const AXES = 3;
export const TOE_CHANNELS = 2;
export const OFF_FOOT = -1;
const SIDES = ['l', 'r'] as const;
const LEG_JOINTS = /^[lr]_(lowleg|foot|ball|talocrural|subtalar|transversetarsal)/;
const BALL_BAND = 0.004;
const SIDEWAYS = new Vector3(1, 0, 0);

const STATION_STEP = 0.005;
const FIT_REACH = 0.95;

export const TOES = {
  widthShares: [0.3, 0.19, 0.18, 0.17, 0.16],
} as const;

export interface Line {
  readonly base: number;
  readonly slope: number;
}

export interface ForefootEdges {
  readonly low: Line;
  readonly high: Line;
}

export interface ToeFields {
  readonly coordinates: Float32Array;
  readonly forefootWidth: number;
  readonly toeLength: number;
  readonly edges: ForefootEdges;
}

interface FootFrame {
  readonly origin: Vector3;
  readonly forward: Vector3;
  readonly sideways: Vector3;
  across: number;
}

interface FootMeasure {
  readonly width: number;
  readonly length: number;
  readonly edges: ForefootEdges;
}

function dominantJoint(figure: Figure, vertex: number): number {
  const { start, joints, weights } = figure.skin;
  let best = start[vertex];
  for (let i = best + 1; i < start[vertex + 1]; i++) if (weights[i] > weights[best]) best = i;
  return joints[best];
}

function footVertices(figure: Figure): Map<string, number[]> {
  const groups = new Map<string, number[]>(SIDES.map((side) => [side, []]));
  for (let v = 0; v < figure.vertexCount; v++) {
    const name = figure.jointNames[dominantJoint(figure, v)];
    if (LEG_JOINTS.test(name)) groups.get(name[0])?.push(v);
  }
  return groups;
}

function footFrame(frame: RestFrame, side: string): FootFrame {
  const origin = frame.joint(`${side}_ball`);
  const forward = origin
    .clone()
    .sub(frame.joint(`${side}_foot`))
    .normalize();
  const towardBigToe = -Math.sign(origin.x);
  const sideways = SIDEWAYS.clone()
    .addScaledVector(forward, -forward.x)
    .normalize()
    .multiplyScalar(towardBigToe);
  return { origin, forward, sideways, across: 0 };
}

function coordinatesOf(figure: Figure, vertex: number, foot: FootFrame, out: Vector3): Vector3 {
  out.fromArray(figure.restPositions, vertex * AXES).sub(foot.origin);
  return out.set(out.dot(foot.forward), out.dot(foot.sideways) - foot.across, 0);
}

function fitLine(points: readonly (readonly [number, number])[]): Line {
  const n = points.length;
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n;
  const spread = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  const slope = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0) / spread;
  return { base: meanY - slope * meanX, slope };
}

function forefootEdges(coords: readonly Vector3[], length: number): ForefootEdges {
  const stations = Math.floor((length * FIT_REACH) / STATION_STEP);
  const low: [number, number][] = [];
  const high: [number, number][] = [];
  for (let k = 0; k <= stations; k++) {
    const centre = k * STATION_STEP;
    const near = coords.filter((c) => Math.abs(c.x - centre) <= STATION_STEP / 2);
    if (near.length === 0) continue;
    low.push([centre, Math.min(...near.map((c) => c.y))]);
    high.push([centre, Math.max(...near.map((c) => c.y))]);
  }
  return { low: fitLine(low), high: fitLine(high) };
}

function measure(figure: Figure, vertices: number[], foot: FootFrame): FootMeasure {
  const scratch = new Vector3();
  let low = Infinity;
  let high = -Infinity;
  let length = 0;
  for (const v of vertices) {
    const { x, y } = coordinatesOf(figure, v, foot, scratch);
    length = Math.max(length, x);
    if (Math.abs(x) < BALL_BAND) {
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
  }
  foot.across = (low + high) / 2;
  const forefoot = vertices
    .map((v) => coordinatesOf(figure, v, foot, new Vector3()))
    .filter((c) => c.x >= 0);
  return { width: high - low, length, edges: forefootEdges(forefoot, length) };
}

function averageLine(lines: readonly Line[]): Line {
  const mean = (pick: (line: Line) => number) =>
    lines.reduce((sum, line) => sum + pick(line), 0) / lines.length;
  return { base: mean((line) => line.base), slope: mean((line) => line.slope) };
}

export function toeFields(figure: Figure, frame: RestFrame): ToeFields {
  const coordinates = new Float32Array(figure.vertexCount * TOE_CHANNELS).fill(OFF_FOOT);
  const groups = footVertices(figure);
  const scratch = new Vector3();
  const measures = SIDES.map((side) => {
    const vertices = groups.get(side) as number[];
    const foot = footFrame(frame, side);
    const result = measure(figure, vertices, foot);
    for (const v of vertices) {
      coordinatesOf(figure, v, foot, scratch);
      coordinates[v * TOE_CHANNELS] = scratch.x;
      coordinates[v * TOE_CHANNELS + 1] = scratch.y;
    }
    return result;
  });
  const mean = (pick: (m: FootMeasure) => number) =>
    measures.reduce((sum, m) => sum + pick(m), 0) / measures.length;
  return {
    coordinates,
    forefootWidth: mean((m) => m.width),
    toeLength: mean((m) => m.length),
    edges: {
      low: averageLine(measures.map((m) => m.edges.low)),
      high: averageLine(measures.map((m) => m.edges.high)),
    },
  };
}

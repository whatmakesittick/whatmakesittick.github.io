import type { RestSide } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import { restJoints, restLengths, type RestLengths } from './measure.ts';
import { aposeFrames, restSide, type Frames } from './restpose.ts';
import type { Shape } from './shape.ts';
import type { BoneWeights } from './source.ts';
import type { Vec } from './vec.ts';

const PART_WEIGHT = 0.5;
const SHOULDER_WINDOW_BELOW = 0.02;
const SHOULDER_WINDOW_ABOVE = 0.02;
const CHEST_LEVEL = 0.2;
const CHEST_SLAB = 0.02;
const CHEST_HALF_WIDTH = 0.17;

export interface PartSets {
  middleFinger: number[];
  thumb: number[];
  foot: number[];
  head: number[];
}

export interface APose {
  readonly shape: Shape;
  readonly bodyVertices: number[];
  readonly parts: PartSets;
  readonly frames: Frames;
  readonly rest: RestSide;
}

export function vertexSet(weights: BoneWeights, pattern: RegExp): Set<number> {
  const totals = new Map<number, number>();
  for (const [name, entries] of Object.entries(weights)) {
    if (!pattern.test(name)) continue;
    for (const [vertex, weight] of entries) totals.set(vertex, (totals.get(vertex) ?? 0) + weight);
  }
  return new Set([...totals].filter(([, total]) => total > PART_WEIGHT).map(([vertex]) => vertex));
}

export function partSets(weights: BoneWeights, bodyVertices: ReadonlySet<number>): PartSets {
  const inBody = (pattern: RegExp): number[] =>
    [...vertexSet(weights, pattern)].filter((v) => bodyVertices.has(v));
  return {
    middleFinger: inBody(/^finger3-\d\.R$/),
    thumb: inBody(/^finger1-\d\.R$/),
    foot: inBody(/^(foot|toe\d-\d)\.R$/),
    head: inBody(/^(head|jaw)$/),
  };
}

export function buildAPose(shape: Shape, parts: PartSets, bodyVertices: number[], eye: Vec): APose {
  const joints = restJoints(shape.joint);
  const frames = aposeFrames(shape.positions, joints, parts);
  const rest = restSide(shape.positions, joints, { ...parts, eye }, frames);
  return { shape, bodyVertices, parts, frames, rest };
}

export interface APoseReport {
  lengths: RestLengths;
  bideltoidHalfWidth: number;
  headHeight: number;
  headWidth: number;
  neckLength: number;
  chestDepth: number;
}

function extent(positions: ArrayLike<number>, vertices: number[], axis: number): [number, number] {
  const values = vertices.map((v) => positions[v * 3 + axis]);
  return [Math.min(...values), Math.max(...values)];
}

export function aposeReport(aPose: APose): APoseReport {
  const { positions, joint } = aPose.shape;
  const shoulder = aPose.rest.shoulder;
  const shoulderRegion = aPose.bodyVertices.filter(
    (v) =>
      positions[v * 3] > shoulder[0] - SHOULDER_WINDOW_BELOW &&
      positions[v * 3] < shoulder[0] + SHOULDER_WINDOW_ABOVE,
  );
  const hipX = aPose.rest.hip[0];
  const chest = aPose.bodyVertices.filter(
    (v) =>
      Math.abs(positions[v * 3] - CHEST_LEVEL * hipX) < CHEST_SLAB &&
      Math.abs(positions[v * 3 + 2]) < CHEST_HALF_WIDTH,
  );
  const [chin, crown] = extent(positions, aPose.parts.head, 0);
  const [left, right] = extent(positions, aPose.parts.head, 2);
  const [back, front] = extent(positions, chest, 1);
  const [lowest, highest] = extent(positions, shoulderRegion, 2);
  return {
    lengths: restLengths(aPose.rest),
    bideltoidHalfWidth: Math.max(-lowest, highest),
    headHeight: crown - chin,
    headWidth: right - left,
    neckLength: joint('head____head')[0] - shoulder[0],
    chestDepth: front - back,
  };
}

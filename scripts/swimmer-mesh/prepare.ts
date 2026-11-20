import { INFLUENCES } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import { buildAPose, partSets, type APose } from './apose.ts';
import { MIDLINE_TOLERANCE } from './config.ts';
import { rotate } from './matrix.ts';
import { reposeBody } from './repose.ts';
import type { Frames } from './restpose.ts';
import { shapeBody } from './shape.ts';
import type { Source } from './source.ts';
import { fillHoles, type Model } from './topology.ts';
import { mapWeights } from './weights.ts';
import { centroid, type Vec } from './vec.ts';

export interface PreparedBody {
  readonly model: Model;
  readonly joint: (name: string) => Vec;
  readonly hipX: number;
  readonly parts: { middleFinger: number[]; thumb: number[]; foot: number[] };
  readonly frames: Frames;
  readonly aPose: APose;
  readonly eye: Vec;
  readonly eyeRadius: number;
  readonly filledHoles: number[];
  readonly straddling: number;
}

function compact(model: Model, keep: number[]): { model: Model; remap: Map<number, number> } {
  const remap = new Map(keep.map((vertex, index) => [vertex, index]));
  const positions = new Float64Array(keep.length * 3);
  const joints = new Uint8Array(keep.length * INFLUENCES);
  const weights = new Float32Array(keep.length * INFLUENCES);
  keep.forEach((vertex, index) => {
    positions.set(model.positions.subarray(vertex * 3, vertex * 3 + 3), index * 3);
    joints.set(
      model.joints.subarray(vertex * INFLUENCES, (vertex + 1) * INFLUENCES),
      index * INFLUENCES,
    );
    weights.set(
      model.weights.subarray(vertex * INFLUENCES, (vertex + 1) * INFLUENCES),
      index * INFLUENCES,
    );
  });
  return {
    model: { positions, triangles: model.triangles.map((v) => remap.get(v)!), joints, weights },
    remap,
  };
}

function cutRightHalf(model: Model): {
  model: Model;
  remap: Map<number, number>;
  straddling: number;
} {
  const kept: number[] = [];
  let straddling = 0;
  for (let i = 0; i < model.triangles.length; i += 3) {
    const zs = [0, 1, 2].map((k) => model.positions[model.triangles[i + k] * 3 + 2]);
    const low = Math.min(...zs);
    const high = Math.max(...zs);
    if (low < -MIDLINE_TOLERANCE && high > MIDLINE_TOLERANCE) straddling++;
    else if (high > MIDLINE_TOLERANCE)
      kept.push(model.triangles[i], model.triangles[i + 1], model.triangles[i + 2]);
  }
  const used = [...new Set(kept)].sort((a, b) => a - b);
  const { model: result, remap } = compact({ ...model, triangles: kept }, used);
  for (let v = 0; v < result.positions.length / 3; v++) {
    if (Math.abs(result.positions[v * 3 + 2]) < MIDLINE_TOLERANCE) result.positions[v * 3 + 2] = 0;
  }
  return { model: result, remap, straddling };
}

export function prepareBody(source: Source): PreparedBody {
  const shape = shapeBody(source);
  const total = shape.positions.length / 3;
  const hipX =
    (shape.joint('upperleg01.L____head')[0] + shape.joint('upperleg01.R____head')[0]) / 2;
  const used = [...new Set(shape.triangles)].sort((a, b) => a - b);

  const eyeVertices = [...source.base.groupVertices['helper-r-eye']];
  const eyeX = eyeVertices.map((v) => shape.positions[v * 3]);
  const eye = centroid(shape.positions, eyeVertices);
  if (eye[2] <= 0) throw new Error('helper-r-eye is not on the +z side');
  const eyeRadius = (Math.max(...eyeX) - Math.min(...eyeX)) / 2;

  const fullParts = partSets(source.weights, new Set(used));
  const aPose = buildAPose(shape, fullParts, used, eye);
  const posed = reposeBody({
    positions: shape.positions,
    rest: shape.joint,
    skeleton: source.skeleton,
    weights: source.weights,
    palm: aPose.frames.palm,
    toeDirection: aPose.frames.toeDirection,
    midlineTolerance: MIDLINE_TOLERANCE,
  });
  const frames: Frames = {
    palm: rotate(posed.rotation('wrist.R'), aPose.frames.palm),
    sole: rotate(posed.rotation('foot.R'), aPose.frames.sole),
    toeDirection: rotate(posed.rotation('foot.R'), aPose.frames.toeDirection),
  };
  const skin = mapWeights(
    source.skeleton,
    source.weights,
    total,
    (v) => shape.positions[v * 3],
    hipX,
    (v) => Math.abs(shape.positions[v * 3 + 2]) < MIDLINE_TOLERANCE,
  );
  const full: Model = { positions: posed.positions, triangles: shape.triangles, ...skin };
  const { model: body, remap } = compact(full, used);
  const filledHoles = fillHoles(body);
  const { model, remap: halfRemap, straddling } = cutRightHalf(body);
  const toHalf = (vertices: Iterable<number>): number[] =>
    [...vertices]
      .filter((v) => remap.has(v))
      .map((v) => remap.get(v)!)
      .filter((v) => halfRemap.has(v))
      .map((v) => halfRemap.get(v)!);
  const parts = {
    middleFinger: toHalf(fullParts.middleFinger),
    thumb: toHalf(fullParts.thumb),
    foot: toHalf(fullParts.foot),
  };
  return {
    model,
    joint: posed.joint,
    hipX,
    parts,
    frames,
    aPose,
    eye,
    eyeRadius,
    filledHoles,
    straddling,
  };
}

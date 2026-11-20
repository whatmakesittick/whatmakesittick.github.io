import type { RestSide } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import {
  cross,
  dot,
  length,
  normalize,
  perpendicular,
  point,
  scale,
  sub,
  type Vec,
} from './vec.ts';

const ELBOW_STRAIGHT_COS = Math.cos((5 * Math.PI) / 180);
const UP: Vec = [0, 1, 0];
const SOLE_DOWN: Vec = [-1, 0, 0];

export interface RestJoints {
  shoulder: Vec;
  elbow: Vec;
  wrist: Vec;
  hip: Vec;
  knee: Vec;
  ankle: Vec;
  footTail: Vec;
  thumbTip: Vec;
}

export function farthest(
  positions: ArrayLike<number>,
  vertices: number[],
  from: Vec,
  direction?: Vec,
): Vec {
  let best = point(positions, vertices[0]);
  let bestScore = -Infinity;
  for (const v of vertices) {
    const offset = sub(point(positions, v), from);
    const score = direction ? dot(offset, direction) : length(offset);
    if (score > bestScore) [bestScore, best] = [score, point(positions, v)];
  }
  return best;
}

function elbowBack(joints: RestJoints): Vec {
  const upper = normalize(sub(joints.elbow, joints.shoulder));
  const lower = normalize(sub(joints.wrist, joints.elbow));
  if (dot(upper, lower) < ELBOW_STRAIGHT_COS)
    return normalize(perpendicular(scale(lower, -1), upper));
  return normalize(perpendicular(UP, upper));
}

function palmNormal(joints: RestJoints, fingertip: Vec): Vec {
  const along = normalize(sub(fingertip, joints.wrist));
  const thumb = normalize(perpendicular(sub(joints.thumbTip, joints.wrist), along));
  return normalize(cross(thumb, along));
}

export function restSide(
  positions: ArrayLike<number>,
  joints: RestJoints,
  parts: { middleFinger: number[]; foot: number[]; eye: Vec },
): RestSide {
  const fingertip = farthest(positions, parts.middleFinger, joints.wrist);
  const toeDirection = normalize(perpendicular(sub(joints.footTail, joints.ankle), SOLE_DOWN));
  const toeTip = farthest(positions, parts.foot, joints.ankle, toeDirection);
  return {
    shoulder: joints.shoulder,
    elbow: joints.elbow,
    wrist: joints.wrist,
    fingertip,
    palm: palmNormal(joints, fingertip),
    elbowBack: elbowBack(joints),
    hip: joints.hip,
    knee: joints.knee,
    ankle: joints.ankle,
    toeTip,
    sole: normalize(perpendicular(SOLE_DOWN, sub(toeTip, joints.ankle))),
    eye: parts.eye,
  };
}

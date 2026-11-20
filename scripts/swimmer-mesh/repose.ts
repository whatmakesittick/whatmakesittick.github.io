import {
  arcBetween,
  axisAngle,
  compose,
  degrees,
  IDENTITY,
  mirrorRigid,
  rotate,
  signedAngle,
  transformPoint,
  turnAbout,
  type Mat3,
  type Rigid,
} from './matrix.ts';
import type { BoneWeights, Skeleton } from './source.ts';
import { cross, dot, normalize, perpendicular, sub, type Vec } from './vec.ts';

const CLAVICLE_RISE = degrees(15);
const CLAVICLE_FORWARD = degrees(10);
const SCAPULA_LIFT = degrees(10);
const ARM_DIRECTION = normalize([0.17, -0.6, 0.78]);
const ELBOW_BEND = degrees(20);
const MAX_TWIST = degrees(60);
const TWIST_STEP = degrees(0.5);
const FINGER_CURL = degrees(12);
const THUMB_CURL = degrees(10);
const PLANTAR_FLEXION = degrees(40);
const FINGERS = [2, 3, 4, 5];
const MIDDLE_FINGER = 3;
const THUMB = 1;
const JOINTS_PER_FINGER = 3;

const DOWN: Vec = [-1, 0, 0];
const TOWARD_HEAD: Vec = [1, 0, 0];
const FORWARD: Vec = [0, -1, 0];

interface Frame {
  readonly parent: Rigid;
}

interface Turn {
  readonly axis: Vec;
  readonly angle: number;
  readonly pivot?: Vec;
}

type Rule = (frame: Frame) => Turn[];
type Rules = Record<string, Rule>;
type Rest = (name: string) => Vec;

interface Line {
  readonly axis: Vec;
  readonly pivot: Vec;
}

export interface Reposed {
  readonly positions: Float64Array;
  readonly joint: (name: string) => Vec;
  readonly rotation: (bone: string) => Mat3;
}

export interface ReposeInput {
  readonly positions: Float64Array;
  readonly rest: Rest;
  readonly skeleton: Skeleton;
  readonly weights: BoneWeights;
  readonly palm: Vec;
  readonly toeDirection: Vec;
  readonly midlineTolerance: number;
}

const headOf = (bone: string): string => `${bone}____head`;
const tailOf = (bone: string): string => `${bone}____tail`;

function girdleRules(rest: Rest): Rules {
  return {
    'clavicle.R': ({ parent }) => {
      const along = rotate(parent.r, sub(rest(tailOf('clavicle.R')), rest(headOf('clavicle.R'))));
      const rise = { axis: cross(along, TOWARD_HEAD), angle: CLAVICLE_RISE };
      const risen = rotate(axisAngle(rise.axis, rise.angle), along);
      return [rise, { axis: cross(risen, FORWARD), angle: CLAVICLE_FORWARD }];
    },
    'shoulder01.R': () => [{ axis: cross(DOWN, ARM_DIRECTION), angle: SCAPULA_LIFT }],
    'upperarm01.R': ({ parent }) => {
      const current = rotate(
        parent.r,
        sub(rest(headOf('lowerarm01.R')), rest(headOf('upperarm01.R'))),
      );
      return [arcBetween(current, ARM_DIRECTION)];
    },
  };
}

function forearmRules(rest: Rest, twist: number, line: Line | null): Rules {
  const flexion = normalize(
    cross(sub(rest(headOf('wrist.R')), rest(headOf('lowerarm01.R'))), FORWARD),
  );
  const half = (): Turn[] => (line ? [{ ...line, angle: twist / 2 }] : []);
  return {
    'lowerarm01.R': ({ parent }) => [
      { axis: rotate(parent.r, flexion), angle: ELBOW_BEND },
      ...half(),
    ],
    'lowerarm02.R': half,
  };
}

function chainDirection(rest: Rest, finger: number): Vec {
  return sub(rest(tailOf(`finger${finger}-3.R`)), rest(headOf(`finger${finger}-1.R`)));
}

function handRules(rest: Rest, wrist: Mat3, palm: Vec): Rules {
  const normal = rotate(wrist, palm);
  const inPalm = (finger: number): Vec =>
    perpendicular(rotate(wrist, chainDirection(rest, finger)), normal);
  const target = inPalm(MIDDLE_FINGER);
  const curlAxis = normalize(cross(target, normal));
  const rules: Rules = {};
  for (const finger of [THUMB, ...FINGERS]) {
    const curl = finger === THUMB ? THUMB_CURL : FINGER_CURL;
    const close: Turn = { axis: normal, angle: signedAngle(inPalm(finger), target, normal) };
    for (let joint = 1; joint <= JOINTS_PER_FINGER; joint++) {
      const turns: Turn[] = [{ axis: curlAxis, angle: curl }];
      rules[`finger${finger}-${joint}.R`] = () => (joint === 1 ? [close, ...turns] : turns);
    }
  }
  return rules;
}

function footRules(toeDirection: Vec): Rules {
  return { 'foot.R': () => [{ axis: cross(toeDirection, DOWN), angle: PLANTAR_FLEXION }] };
}

function transforms(skeleton: Skeleton, rest: Rest, rules: Rules): (bone: string) => Rigid {
  const memo = new Map<string, Rigid>();
  const right = (bone: string): Rigid => {
    const cached = memo.get(bone);
    if (cached) return cached;
    const parentName = skeleton.bones[bone].parent;
    const parent = parentName && parentName.endsWith('.R') ? right(parentName) : IDENTITY;
    const pivot = transformPoint(parent, rest(headOf(bone)));
    const turns = rules[bone]?.({ parent }) ?? [];
    const result = turns.reduce(
      (current, turn) => compose(turnAbout(turn.axis, turn.angle, turn.pivot ?? pivot), current),
      parent,
    );
    memo.set(bone, result);
    return result;
  };
  return (bone) => {
    if (bone.endsWith('.L')) return mirrorRigid(right(`${bone.slice(0, -2)}.R`));
    return bone.endsWith('.R') ? right(bone) : IDENTITY;
  };
}

function bestTwist(palm: Vec, axis: Vec): number {
  let best = 0;
  let bestScore = -Infinity;
  for (let angle = -MAX_TWIST; angle <= MAX_TWIST + 1e-9; angle += TWIST_STEP) {
    const score = dot(rotate(axisAngle(axis, angle), palm), DOWN);
    if (score > bestScore) [best, bestScore] = [angle, score];
  }
  return best;
}

function boneOf(joint: string): string {
  return joint.slice(0, joint.indexOf('____'));
}

function blend(
  positions: Float64Array,
  weights: BoneWeights,
  transformOf: (bone: string) => Rigid,
): Float64Array {
  const count = positions.length / 3;
  const sum = new Float64Array(count * 3);
  const total = new Float64Array(count);
  for (const [bone, entries] of Object.entries(weights)) {
    const rigid = transformOf(bone);
    for (const [vertex, weight] of entries) {
      if (vertex >= count) continue;
      const moved = transformPoint(rigid, positions.subarray(vertex * 3, vertex * 3 + 3));
      for (let k = 0; k < 3; k++) sum[vertex * 3 + k] += weight * moved[k];
      total[vertex] += weight;
    }
  }
  return Float64Array.from(positions, (value, i) =>
    total[Math.floor(i / 3)] > 0 ? sum[i] / total[Math.floor(i / 3)] : value,
  );
}

function assertSymmetric(before: Float64Array, after: Float64Array, tolerance: number): void {
  for (let v = 0; v < before.length / 3; v++) {
    if (Math.abs(before[v * 3 + 2]) < tolerance && Math.abs(after[v * 3 + 2]) >= tolerance)
      throw new Error(`Repose pushed midline vertex ${v} off z=0 (${after[v * 3 + 2]})`);
  }
}

export function reposeBody(input: ReposeInput): Reposed {
  const { rest, skeleton } = input;
  const armOnly = (twist: number, line: Line | null): Rules => ({
    ...girdleRules(rest),
    ...forearmRules(rest, twist, line),
  });
  const untwisted = transforms(skeleton, rest, armOnly(0, null));
  const elbow = transformPoint(untwisted('lowerarm01.R'), rest(headOf('lowerarm01.R')));
  const wristHead = transformPoint(untwisted('wrist.R'), rest(headOf('wrist.R')));
  const line: Line = { axis: normalize(sub(wristHead, elbow)), pivot: elbow };
  const twist = bestTwist(rotate(untwisted('wrist.R').r, input.palm), line.axis);
  const twisted = transforms(skeleton, rest, armOnly(twist, line));
  const rules: Rules = {
    ...armOnly(twist, line),
    ...handRules(rest, twisted('wrist.R').r, input.palm),
    ...footRules(input.toeDirection),
  };
  const transformOf = transforms(skeleton, rest, rules);
  const positions = blend(input.positions, input.weights, transformOf);
  assertSymmetric(input.positions, positions, input.midlineTolerance);
  return {
    positions,
    joint: (name) => transformPoint(transformOf(boneOf(name)), rest(name)),
    rotation: (bone) => transformOf(bone).r,
  };
}

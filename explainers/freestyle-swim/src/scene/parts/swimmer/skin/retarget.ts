import { Vector3 } from 'three';
import { BODY, HEEL_SHARE } from '../../../rig/constants';
import { BONE_COUNT, INFLUENCES, centreBone, sideBone } from './types';
import type { RestPose, RestSide, SideBoneId, SkinMesh, Triple } from './types';

export interface BoneCorrection {
  readonly origin: Vector3;
  readonly target: Vector3;
  readonly axis: Vector3;
  stretch: number;
}

export interface Retargeted {
  readonly rest: RestPose;
  readonly corrections: readonly BoneCorrection[];
}

const SIDES = [
  { id: 'right', sign: 1 },
  { id: 'left', sign: -1 },
] as const;
const PELVIS_SHARE = { spineLow: 2 / 3, spineMid: 1 / 3 } as const;
const FOOT_LENGTH = BODY.foot * (1 - HEEL_SHARE);

function vec(value: Triple): Vector3 {
  return new Vector3(value[0], value[1], value[2]);
}

function triple(value: Vector3): Triple {
  return [value.x, value.y, value.z];
}

function newCorrection(): BoneCorrection {
  return { origin: new Vector3(), target: new Vector3(), axis: new Vector3(1, 0, 0), stretch: 0 };
}

function shiftOnly(correction: BoneCorrection, shift: Vector3): void {
  correction.target.copy(correction.origin).add(shift);
}

function limbSegment(
  correction: BoneCorrection,
  from: Vector3,
  to: Vector3,
  newFrom: Vector3,
  length: number,
  newTo: Vector3,
): void {
  const axis = correction.axis.subVectors(to, from);
  const restLength = axis.length();
  axis.divideScalar(restLength);
  correction.origin.copy(from);
  correction.target.copy(newFrom);
  correction.stretch = length / restLength - 1;
  newTo.copy(newFrom).addScaledVector(axis, length);
}

function retargetSide(
  side: RestSide,
  sign: number,
  corrections: BoneCorrection[],
  id: 'right' | 'left',
): RestSide {
  const at = (bone: SideBoneId) => corrections[sideBone(bone, id)];
  const shoulder = vec(side.shoulder);
  const newShoulder = new Vector3(0, 0, sign * BODY.shoulderHalf);
  const [elbow, wrist, fingertip] = [vec(side.elbow), vec(side.wrist), vec(side.fingertip)];
  const [newElbow, newWrist, newFingertip] = [new Vector3(), new Vector3(), new Vector3()];
  limbSegment(at('upperArm'), shoulder, elbow, newShoulder, BODY.upperArm, newElbow);
  limbSegment(at('forearm'), elbow, wrist, newElbow, BODY.forearm, newWrist);
  limbSegment(at('hand'), wrist, fingertip, newWrist, BODY.hand, newFingertip);
  shiftOnly(at('girdle'), newShoulder.clone().sub(shoulder));
  copyCorrection(at('upperArmRoot'), at('upperArm'));
  copyCorrection(at('forearmRoot'), at('forearm'));

  const hip = vec(side.hip);
  const newHip = new Vector3(BODY.hipX, BODY.hipY, sign * BODY.hipHalf);
  const [knee, ankle, toeTip] = [vec(side.knee), vec(side.ankle), vec(side.toeTip)];
  const [newKnee, newAnkle, newToe] = [new Vector3(), new Vector3(), new Vector3()];
  limbSegment(at('thigh'), hip, knee, newHip, BODY.thigh, newKnee);
  limbSegment(at('shin'), knee, ankle, newKnee, BODY.shank, newAnkle);
  limbSegment(at('foot'), ankle, toeTip, newAnkle, FOOT_LENGTH, newToe);

  return {
    shoulder: triple(newShoulder),
    elbow: triple(newElbow),
    wrist: triple(newWrist),
    fingertip: triple(newFingertip),
    palm: side.palm,
    elbowBack: side.elbowBack,
    hip: triple(newHip),
    knee: triple(newKnee),
    ankle: triple(newAnkle),
    toeTip: triple(newToe),
    sole: side.sole,
    eye: side.eye,
  };
}

function copyCorrection(into: BoneCorrection, from: BoneCorrection): void {
  into.origin.copy(from.origin);
  into.target.copy(from.target);
  into.axis.copy(from.axis);
  into.stretch = from.stretch;
}

function hipCentre(rest: RestPose): Vector3 {
  return vec(rest.right.hip).add(vec(rest.left.hip)).multiplyScalar(0.5);
}

function shiftedBy(value: Triple, shift: Vector3): Triple {
  return [value[0] + shift.x, value[1] + shift.y, value[2] + shift.z];
}

export function retarget(rest: RestPose): Retargeted {
  const corrections = Array.from({ length: BONE_COUNT }, newCorrection);
  const sides = {} as Record<'right' | 'left', RestSide>;
  SIDES.forEach(({ id, sign }) => {
    sides[id] = retargetSide(rest[id], sign, corrections, id);
  });

  const pelvisShift = new Vector3(BODY.hipX, BODY.hipY, 0).sub(hipCentre(rest).setComponent(2, 0));
  shiftOnly(corrections[centreBone('pelvis')], pelvisShift);
  shiftOnly(
    corrections[centreBone('spineLow')],
    pelvisShift.clone().multiplyScalar(PELVIS_SHARE.spineLow),
  );
  shiftOnly(
    corrections[centreBone('spineMid')],
    pelvisShift.clone().multiplyScalar(PELVIS_SHARE.spineMid),
  );

  const headShift = vec(BODY.neckBase).sub(vec(rest.neck));
  shiftOnly(corrections[centreBone('neck')], headShift);
  shiftOnly(corrections[centreBone('head')], headShift);

  const shifted: RestPose = {
    right: { ...sides.right, eye: shiftedBy(rest.right.eye, headShift) },
    left: { ...sides.left, eye: shiftedBy(rest.left.eye, headShift) },
    neck: triple(vec(BODY.neckBase)),
    headTop: shiftedBy(rest.headTop, headShift),
    eyeRadius: rest.eyeRadius,
    strap: rest.strap.map((point) => shiftedBy(point, headShift)),
  };
  return { rest: shifted, corrections };
}

export function applyCorrections(
  mesh: SkinMesh,
  corrections: readonly BoneCorrection[],
  out: Float32Array,
): void {
  for (let v = 0; v < mesh.vertexCount; v++) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    const [px, py, pz] = [
      mesh.positions[3 * v],
      mesh.positions[3 * v + 1],
      mesh.positions[3 * v + 2],
    ];
    for (let i = 0; i < INFLUENCES; i++) {
      const weight = mesh.weights[v * INFLUENCES + i];
      if (weight === 0) continue;
      const { origin, target, axis, stretch } = corrections[mesh.joints[v * INFLUENCES + i]];
      const [dx, dy, dz] = [px - origin.x, py - origin.y, pz - origin.z];
      const extra = stretch * (axis.x * dx + axis.y * dy + axis.z * dz);
      sx += weight * (target.x + dx + axis.x * extra);
      sy += weight * (target.y + dy + axis.y * extra);
      sz += weight * (target.z + dz + axis.z * extra);
    }
    out[3 * v] = sx;
    out[3 * v + 1] = sy;
    out[3 * v + 2] = sz;
  }
}

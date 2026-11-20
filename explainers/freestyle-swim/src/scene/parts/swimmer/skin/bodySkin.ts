import { Quaternion, Vector3 } from 'three';
import type { Matrix4 } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { ArmId } from '../../../../ids';
import { BODY } from '../../../rig/constants';
import type { ArmPose, LegPose, Skeleton } from '../../../rig/skeleton';
import { DUAL_STRIDE, blendVertex, packRigid, translationOf } from './dualQuaternion';
import { frameQuaternion, partialTwist, projectPerpendicular } from './frames';
import { applyCorrections, retarget } from './retarget';
import { BONE_COUNT, centreBone, sideBone } from './types';
import type { RestPose, RestSide, SkinMesh, Triple } from './types';

export const SKIN_TUNING = {
  upperArmTwistShare: 0.35,
  forearmTwistShare: 0.5,
  scapulaSwingShare: 0.3,
  neckShare: 0.5,
  frameFallbackLength: 0.05,
  spineLowBlend: 1 / 3,
  spineMidBlend: 2 / 3,
} as const;

interface LimbRest {
  readonly origin: Vector3;
  readonly axis: Vector3;
  readonly inverse: Quaternion;
}

interface SideRest {
  readonly clavicle: Vector3;
  readonly clavicleDirection: Vector3;
  readonly shoulder: Vector3;
  readonly elbow: Vector3;
  readonly elbowBack: Vector3;
  readonly upperArm: LimbRest;
  readonly forearm: LimbRest;
  readonly hand: LimbRest;
  readonly thigh: LimbRest;
  readonly shin: LimbRest;
  readonly foot: LimbRest;
}

const SIDE_IDS: readonly ArmId[] = ['right', 'left'];
const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT_SCALE = new Vector3(1, 1, 1);
const DOUBLE = 2;
const NORMAL_EPSILON = 1e-12;

function vec(value: Triple): Vector3 {
  return new Vector3(value[0], value[1], value[2]);
}

function limbRest(origin: Vector3, x: Vector3, y: Vector3): LimbRest {
  return {
    origin: origin.clone(),
    axis: x.clone().normalize(),
    inverse: frameQuaternion(x, y, new Quaternion()).invert(),
  };
}

function segment(from: Triple, to: Triple): Vector3 {
  return vec(to).sub(vec(from));
}

function sideRest(side: RestSide): SideRest {
  const palm = vec(side.palm);
  const sole = vec(side.sole);
  return {
    clavicle: vec(side.clavicle),
    clavicleDirection: segment(side.clavicle, side.shoulder),
    shoulder: vec(side.shoulder),
    elbow: vec(side.elbow),
    elbowBack: vec(side.elbowBack),
    upperArm: limbRest(vec(side.shoulder), segment(side.shoulder, side.elbow), vec(side.elbowBack)),
    forearm: limbRest(vec(side.elbow), segment(side.elbow, side.wrist), palm),
    hand: limbRest(vec(side.wrist), segment(side.wrist, side.fingertip), palm),
    thigh: limbRest(vec(side.hip), segment(side.hip, side.knee), Z_AXIS),
    shin: limbRest(vec(side.knee), segment(side.knee, side.ankle), Z_AXIS),
    foot: limbRest(vec(side.ankle), segment(side.ankle, side.toeTip), sole),
  };
}

function restNormals(positions: Float32Array, mesh: SkinMesh): Float32Array {
  const normals = new Float32Array(positions.length);
  const [a, b, c, edgeA, edgeB] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];
  Object.values(mesh.slots).forEach((indices) => {
    for (let i = 0; i < indices.length; i += 3) {
      a.fromArray(positions, 3 * indices[i]);
      b.fromArray(positions, 3 * indices[i + 1]);
      c.fromArray(positions, 3 * indices[i + 2]);
      edgeA.subVectors(b, a);
      edgeB.subVectors(c, a);
      edgeA.cross(edgeB);
      for (let k = 0; k < 3; k++) {
        const at = 3 * indices[i + k];
        normals[at] += edgeA.x;
        normals[at + 1] += edgeA.y;
        normals[at + 2] += edgeA.z;
      }
    }
  });
  for (let v = 0; v < mesh.vertexCount; v++) {
    const length = Math.hypot(normals[3 * v], normals[3 * v + 1], normals[3 * v + 2]);
    if (length < NORMAL_EPSILON) continue;
    for (let k = 0; k < 3; k++) normals[3 * v + k] /= length;
  }
  return normals;
}

export class BodySkin {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly restPositions: Float32Array;
  readonly rest: RestPose;

  private readonly mesh: SkinMesh;
  private readonly restNormal: Float32Array;
  private readonly sides: Record<ArmId, SideRest>;
  private readonly lastBack: Record<ArmId, Vector3>;
  private readonly bank = new Float64Array(BONE_COUNT * DUAL_STRIDE);
  private readonly boneQ = Array.from({ length: BONE_COUNT }, () => new Quaternion());
  private readonly boneT = Array.from({ length: BONE_COUNT }, () => new Vector3());
  private readonly blend = new Float64Array(DUAL_STRIDE);
  private readonly frameQ = new Quaternion();
  private readonly relative = new Quaternion();
  private readonly swing = new Quaternion();
  private readonly twist = new Quaternion();
  private readonly pivot = new Quaternion();
  private readonly axisX = new Vector3();
  private readonly axisY = new Vector3();
  private readonly offset = new Vector3();
  private readonly shift = new Vector3();

  constructor(mesh: SkinMesh) {
    const { rest, corrections } = retarget(mesh.rest);
    this.mesh = mesh;
    this.rest = rest;
    this.positions = new Float32Array(mesh.positions.length);
    this.normals = new Float32Array(mesh.positions.length);
    this.restPositions = new Float32Array(mesh.positions.length);
    applyCorrections(mesh, corrections, this.restPositions);
    this.restNormal = restNormals(this.restPositions, mesh);
    this.sides = { right: sideRest(rest.right), left: sideRest(rest.left) };
    this.lastBack = {
      right: this.sides.right.elbowBack.clone(),
      left: this.sides.left.elbowBack.clone(),
    };
  }

  apply(skeleton: Skeleton): void {
    this.poseTrunk(skeleton);
    SIDE_IDS.forEach((id) => {
      this.poseArm(id, skeleton.arms[id]);
      this.poseLeg(id, skeleton.legs[id], skeleton.hipRollRad);
    });
    this.poseHead(skeleton);
    this.skin();
  }

  boneMatrix(bone: number, target: Matrix4): Matrix4 {
    return target.compose(this.boneT[bone], this.boneQ[bone], UNIT_SCALE);
  }

  private store(bone: number, q: Quaternion, posed: Vector3, rest: Vector3): void {
    this.boneQ[bone].copy(q);
    this.boneT[bone].copy(rest).applyQuaternion(q).negate().add(posed);
    packRigid(this.bank, bone, this.boneQ[bone], this.boneT[bone]);
  }

  private storeAboutOrigin(bone: number, angle: number, lift: number): void {
    this.frameQ.setFromAxisAngle(X_AXIS, angle);
    this.boneQ[bone].copy(this.frameQ);
    this.boneT[bone].set(0, lift, 0).applyQuaternion(this.frameQ);
    packRigid(this.bank, bone, this.boneQ[bone], this.boneT[bone]);
  }

  private poseTrunk(skeleton: Skeleton): void {
    const { hipRollRad, shoulderRollRad, hipLiftM } = skeleton;
    const { spineLowBlend, spineMidBlend } = SKIN_TUNING;
    this.storeAboutOrigin(centreBone('pelvis'), hipRollRad, hipLiftM);
    this.storeAboutOrigin(
      centreBone('spineLow'),
      lerp(hipRollRad, shoulderRollRad, smoothstep(spineLowBlend)),
      hipLiftM * (1 - spineLowBlend),
    );
    this.storeAboutOrigin(
      centreBone('spineMid'),
      lerp(hipRollRad, shoulderRollRad, smoothstep(spineMidBlend)),
      hipLiftM * (1 - spineMidBlend),
    );
    this.storeAboutOrigin(centreBone('chest'), shoulderRollRad, 0);
  }

  private placeFrame(bone: number, rest: LimbRest, origin: Vector3, x: Vector3, y: Vector3): void {
    frameQuaternion(x, y, this.frameQ).multiply(rest.inverse);
    this.store(bone, this.frameQ, origin, rest.origin);
  }

  private poseUpperArm(id: ArmId, arm: ArmPose): void {
    const rest = this.sides[id];
    const back = this.lastBack[id];
    this.axisX.subVectors(arm.elbow, arm.shoulder).normalize();
    this.axisY.subVectors(arm.elbow, arm.wrist);
    projectPerpendicular(this.axisY, this.axisX);
    if (this.axisY.length() >= SKIN_TUNING.frameFallbackLength) back.copy(this.axisY).normalize();
    else projectPerpendicular(back, this.axisX).normalize();
    this.placeFrame(sideBone('upperArm', id), rest.upperArm, arm.shoulder, this.axisX, back);
  }

  private twistedFollower(
    bone: number,
    parent: number,
    source: number,
    rest: LimbRest,
    share: number,
    originPosed: Vector3,
  ): void {
    const child = this.boneQ[source];
    const base = this.boneQ[parent];
    this.relative.copy(base).invert().multiply(child);
    partialTwist(this.relative, rest.axis, share, this.swing, this.twist);
    this.pivot.copy(base).multiply(this.swing).multiply(this.twist);
    this.store(bone, this.pivot, originPosed, rest.origin);
  }

  private poseClavicle(id: ArmId, arm: ArmPose): void {
    const rest = this.sides[id];
    const chest = this.boneQ[centreBone('chest')];
    const joint = this.offset
      .copy(rest.clavicle)
      .applyQuaternion(chest)
      .add(this.boneT[centreBone('chest')]);
    this.axisX.copy(rest.clavicleDirection).applyQuaternion(chest);
    this.axisY.subVectors(arm.shoulder, joint);
    this.pivot.setFromUnitVectors(this.axisX.normalize(), this.axisY.normalize()).multiply(chest);
    this.store(sideBone('clavicle', id), this.pivot, joint, rest.clavicle);
  }

  private poseScapula(id: ArmId, arm: ArmPose): void {
    const rest = this.sides[id];
    const chest = this.boneQ[centreBone('chest')];
    this.relative.copy(chest).invert().multiply(this.boneQ[sideBone('upperArm', id)]);
    partialTwist(this.relative, rest.upperArm.axis, 0, this.swing, this.twist);
    this.pivot.identity().slerp(this.swing, SKIN_TUNING.scapulaSwingShare);
    this.pivot.premultiply(chest);
    this.store(sideBone('scapula', id), this.pivot, arm.shoulder, rest.shoulder);
  }

  private poseArm(id: ArmId, arm: ArmPose): void {
    const rest = this.sides[id];
    this.poseUpperArm(id, arm);
    this.poseClavicle(id, arm);
    this.poseScapula(id, arm);
    this.twistedFollower(
      sideBone('upperArmRoot', id),
      sideBone('scapula', id),
      sideBone('upperArm', id),
      rest.upperArm,
      SKIN_TUNING.upperArmTwistShare,
      arm.shoulder,
    );
    this.axisX.subVectors(arm.wrist, arm.elbow).normalize();
    this.axisY.copy(arm.palm);
    projectPerpendicular(this.axisY, this.axisX);
    this.placeFrame(sideBone('forearm', id), rest.forearm, arm.elbow, this.axisX, this.axisY);
    this.twistedFollower(
      sideBone('forearmRoot', id),
      sideBone('upperArm', id),
      sideBone('forearm', id),
      rest.forearm,
      SKIN_TUNING.forearmTwistShare,
      arm.elbow,
    );
    this.placeFrame(sideBone('hand', id), rest.hand, arm.wrist, arm.handAxis, arm.palm);
  }

  private poseLeg(id: ArmId, leg: LegPose, hipRollRad: number): void {
    const rest = this.sides[id];
    this.shift.set(0, -Math.sin(hipRollRad), Math.cos(hipRollRad));
    this.axisX.subVectors(leg.knee, leg.hip);
    this.placeFrame(sideBone('thigh', id), rest.thigh, leg.hip, this.axisX, this.shift);
    this.axisX.subVectors(leg.ankle, leg.knee);
    this.placeFrame(sideBone('shin', id), rest.shin, leg.knee, this.axisX, this.shift);
    this.placeFrame(sideBone('foot', id), rest.foot, leg.ankle, leg.footAxis, leg.sole);
  }

  private poseHead(skeleton: Skeleton): void {
    const neckRest = this.offset.fromArray(BODY.neckBase);
    this.store(centreBone('head'), skeleton.head, skeleton.neck, neckRest);
    this.pivot.copy(this.boneQ[centreBone('chest')]).slerp(skeleton.head, SKIN_TUNING.neckShare);
    this.store(centreBone('neck'), this.pivot, skeleton.neck, neckRest);
  }

  private skin(): void {
    const { joints, weights, vertexCount } = this.mesh;
    const { blend, restPositions, restNormal, positions, normals } = this;
    for (let v = 0; v < vertexCount; v++) {
      blendVertex(this.bank, joints, weights, v, blend);
      const qx = blend[0];
      const qy = blend[1];
      const qz = blend[2];
      const qw = blend[3];
      translationOf(blend, 0, this.shift);
      this.rotateInto(positions, restPositions, v, qx, qy, qz, qw);
      positions[3 * v] += this.shift.x;
      positions[3 * v + 1] += this.shift.y;
      positions[3 * v + 2] += this.shift.z;
      this.rotateInto(normals, restNormal, v, qx, qy, qz, qw);
    }
  }

  private rotateInto(
    out: Float32Array,
    source: Float32Array,
    v: number,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
  ): void {
    const at = 3 * v;
    const x = source[at];
    const y = source[at + 1];
    const z = source[at + 2];
    const tx = DOUBLE * (qy * z - qz * y);
    const ty = DOUBLE * (qz * x - qx * z);
    const tz = DOUBLE * (qx * y - qy * x);
    out[at] = x + qw * tx + (qy * tz - qz * ty);
    out[at + 1] = y + qw * ty + (qz * tx - qx * tz);
    out[at + 2] = z + qw * tz + (qx * ty - qy * tx);
  }
}

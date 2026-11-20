import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { toRadians } from '@core/math';
import { MOMENTS, strokeAt } from '../../../../model';
import { BODY, HEEL_SHARE } from '../../../rig/constants';
import { createSkeleton, solveSkeleton } from '../../../rig/skeleton';
import type { ArmPose, LegPose, Skeleton } from '../../../rig/skeleton';
import { bodyPose } from '../../../pose';
import { BodySkin } from './bodySkin';
import { decodeSkinMesh } from './decode';
import { SYNTHETIC_REST, buildSyntheticMesh } from './syntheticMesh.testkit';
import { BONE_COUNT, INFLUENCES, centreBone, sideBone } from './types';
import type { Triple } from './types';

const ROOT_Y = bodyPose(0, 0).y;
const UNITS = [
  MOMENTS.entry,
  MOMENTS.catch,
  MOMENTS.underShoulder,
  MOMENTS.pushEnd,
  MOMENTS.recoveryMid,
];
const OFFSETS = [0, 0.37, 0.71];
const POSITION_TOLERANCE = 1e-4;
const RADIUS_TOLERANCE = 0.05;
const TWIST_DEG = 120;
const REST_TOLERANCE = 1e-5;
const GUARD_UNITS = [0, 286, 530, 754, 877, 900];
const GUARD_RATIO = 1.3;
const GUARD_BONES = ['scapula', 'upperArmRoot'] as const;
const SIDES = ['right', 'left'] as const;
const BENCH_RINGS = 40;
const BENCH_RUNS = 400;
const BENCH_LIMIT_MS = 5;

function vec(value: Triple): Vector3 {
  return new Vector3(value[0], value[1], value[2]);
}

function readingSkeleton(units: number): Skeleton {
  const reading = strokeAt(units, {
    pace: 'middle',
    kick: 'six',
    breathing: 'right',
    headUp: false,
  });
  return solveSkeleton(createSkeleton(), reading, 0, ROOT_Y);
}

function posedSkeletons(): Skeleton[] {
  return UNITS.flatMap((units) => OFFSETS.map((offset) => readingSkeleton(units + offset)));
}

function at(array: Float32Array, index: number): Vector3 {
  return new Vector3(array[3 * index], array[3 * index + 1], array[3 * index + 2]);
}

function mirrorVector(source: Vector3, target: Vector3): void {
  target.set(source.x, source.y, -source.z);
}

function mirrorArm(from: ArmPose, to: ArmPose): void {
  (['shoulder', 'elbow', 'wrist', 'hand', 'handAxis', 'palm'] as const).forEach((key) =>
    mirrorVector(from[key], to[key]),
  );
}

function mirrorLeg(from: LegPose, to: LegPose): void {
  (['hip', 'knee', 'ankle', 'toe', 'footAxis', 'sole'] as const).forEach((key) =>
    mirrorVector(from[key], to[key]),
  );
}

function mirrorSkeleton(source: Skeleton): Skeleton {
  const result = createSkeleton();
  result.shoulderRollRad = -source.shoulderRollRad;
  result.hipRollRad = -source.hipRollRad;
  result.hipLiftM = source.hipLiftM;
  mirrorArm(source.arms.right, result.arms.left);
  mirrorArm(source.arms.left, result.arms.right);
  mirrorLeg(source.legs.right, result.legs.left);
  mirrorLeg(source.legs.left, result.legs.right);
  mirrorVector(source.neck, result.neck);
  result.head.set(-source.head.x, -source.head.y, source.head.z, source.head.w);
  return result;
}

function restSkeleton(skin: BodySkin): Skeleton {
  const skeleton = createSkeleton();
  (['right', 'left'] as const).forEach((id) => {
    const side = skin.rest[id];
    const arm = skeleton.arms[id];
    arm.shoulder.copy(vec(side.shoulder));
    arm.elbow.copy(vec(side.elbow));
    arm.wrist.copy(vec(side.wrist));
    arm.handAxis.copy(vec(side.fingertip)).sub(arm.wrist).normalize();
    arm.palm.copy(vec(side.palm));
    arm.hand.copy(arm.wrist).addScaledVector(arm.handAxis, BODY.hand / 2);
    const leg = skeleton.legs[id];
    leg.hip.copy(vec(side.hip));
    leg.knee.copy(vec(side.knee));
    leg.ankle.copy(vec(side.ankle));
    leg.toe.copy(vec(side.toeTip));
    leg.footAxis.copy(leg.toe).sub(leg.ankle).normalize();
    leg.sole.copy(vec(side.sole));
  });
  skeleton.neck.copy(vec(skin.rest.neck));
  return skeleton;
}

function setup(rings = 6) {
  const built = buildSyntheticMesh(rings);
  return { ...built, skin: new BodySkin(built.mesh) };
}

describe('retarget', () => {
  it('moves the rest joints to the rig proportions', () => {
    const { skin } = setup();
    (['right', 'left'] as const).forEach((id) => {
      const side = skin.rest[id];
      const sign = id === 'right' ? 1 : -1;
      expect(side.shoulder).toEqual(SYNTHETIC_REST[id].shoulder);
      expect(vec(side.elbow).distanceTo(vec(side.shoulder))).toBeCloseTo(BODY.upperArm, 6);
      expect(vec(side.wrist).distanceTo(vec(side.elbow))).toBeCloseTo(BODY.forearm, 6);
      expect(vec(side.fingertip).distanceTo(vec(side.wrist))).toBeCloseTo(BODY.hand, 6);
      expect(side.hip).toEqual([BODY.hipX, BODY.hipY, sign * BODY.hipHalf]);
      expect(vec(side.knee).distanceTo(vec(side.hip))).toBeCloseTo(BODY.thigh, 6);
      expect(vec(side.ankle).distanceTo(vec(side.knee))).toBeCloseTo(BODY.shank, 6);
      expect(vec(side.toeTip).distanceTo(vec(side.ankle))).toBeCloseTo(
        BODY.foot * (1 - HEEL_SHARE),
        6,
      );
    });
    expect(skin.rest.neck).toEqual([...BODY.neckBase]);
  });

  it('puts the marker vertices on the retargeted joints', () => {
    const { skin, markers } = setup();
    const side = skin.rest.right;
    (['elbow', 'wrist', 'fingertip', 'knee', 'ankle', 'toeTip'] as const).forEach((key) => {
      const rest = at(skin.restPositions, markers[key]);
      expect(rest.distanceTo(vec(side[key]))).toBeLessThan(POSITION_TOLERANCE);
    });
  });
});

describe('pose', () => {
  it('leaves every vertex in place when the skeleton matches the rest frames', () => {
    const { skin, mesh } = setup();
    skin.apply(restSkeleton(skin));
    for (let v = 0; v < mesh.vertexCount; v++) {
      expect(at(skin.positions, v).distanceTo(at(skin.restPositions, v))).toBeLessThan(
        POSITION_TOLERANCE,
      );
    }
  });

  it('leaves every bone at identity and vertices at rest for a rest skeleton', () => {
    const { skin, mesh } = setup();
    skin.apply(restSkeleton(skin));
    for (let bone = 0; bone < BONE_COUNT; bone++) {
      const e = skin.boneMatrix(bone, new Matrix4()).elements;
      new Matrix4().identity().elements.forEach((value, k) => {
        expect(Math.abs(e[k] - value)).toBeLessThan(REST_TOLERANCE);
      });
    }
    for (let v = 0; v < mesh.vertexCount; v++) {
      expect(at(skin.positions, v).distanceTo(at(skin.restPositions, v))).toBeLessThan(
        REST_TOLERANCE,
      );
    }
  });

  it('keeps the clavicle joint on the chest and its lateral end toward the shoulder', () => {
    const { skin } = setup();
    posedSkeletons().forEach((skeleton) => {
      skin.apply(skeleton);
      SIDES.forEach((id) => {
        const rest = skin.rest[id];
        const clavicle = skin.boneMatrix(sideBone('clavicle', id), new Matrix4());
        const chest = skin.boneMatrix(centreBone('chest'), new Matrix4());
        const joint = vec(rest.clavicle).applyMatrix4(clavicle);
        expect(joint.distanceTo(vec(rest.clavicle).applyMatrix4(chest))).toBeLessThan(
          POSITION_TOLERANCE,
        );
        const lateral = vec(rest.shoulder).applyMatrix4(clavicle).sub(joint).normalize();
        const expected = skeleton.arms[id].shoulder.clone().sub(joint).normalize();
        expect(lateral.distanceTo(expected)).toBeLessThan(POSITION_TOLERANCE);
      });
    });
  });

  it('carries the rest hips onto the rig hips with the pelvis bone', () => {
    const { skin } = setup();
    posedSkeletons().forEach((skeleton) => {
      skin.apply(skeleton);
      const matrix = skin.boneMatrix(centreBone('pelvis'), new Matrix4());
      const hip = vec(skin.rest.right.hip).applyMatrix4(matrix);
      expect(hip.distanceTo(skeleton.legs.right.hip)).toBeLessThan(POSITION_TOLERANCE);
    });
  });

  it('maps the retargeted neck onto the rig neck with the head bone', () => {
    const { skin } = setup();
    posedSkeletons().forEach((skeleton) => {
      skin.apply(skeleton);
      const matrix = skin.boneMatrix(centreBone('head'), new Matrix4());
      const neck = vec(skin.rest.neck).applyMatrix4(matrix);
      expect(neck.distanceTo(skeleton.neck)).toBeLessThan(POSITION_TOLERANCE);
    });
  });

  it('keeps the forearm radius under a palm twist', () => {
    const { skin, forearmRing } = setup();
    const skeleton = readingSkeleton(MOMENTS.catch);
    const { elbow, wrist, palm } = skeleton.arms.right;
    const axis = wrist.clone().sub(elbow).normalize();
    palm.applyQuaternion(new Quaternion().setFromAxisAngle(axis, toRadians(TWIST_DEG)));
    skin.apply(skeleton);
    const rest = at(skin.restPositions, forearmRing[0]);
    const restAxis = vec(skin.rest.right.wrist).sub(vec(skin.rest.right.elbow)).normalize();
    const restRadius = rest.sub(vec(skin.rest.right.elbow)).projectOnPlane(restAxis).length();
    forearmRing.forEach((index) => {
      const radius = at(skin.positions, index).sub(elbow).projectOnPlane(axis).length();
      expect(Math.abs(radius / restRadius - 1)).toBeLessThan(RADIUS_TOLERANCE);
    });
  });

  it('keeps normals unit length', () => {
    const { skin, surfaceCount } = setup();
    posedSkeletons().forEach((skeleton) => {
      skin.apply(skeleton);
      for (let v = 0; v < surfaceCount; v++) {
        expect(at(skin.normals, v).length()).toBeCloseTo(1, 4);
      }
    });
  });

  it('rotates a single-bone vertex normal exactly with its bone', () => {
    const { skin, mesh } = setup();
    skin.apply(restSkeleton(skin));
    const restNormals = Float32Array.from(skin.normals);
    const skeleton = readingSkeleton(MOMENTS.underShoulder);
    skin.apply(skeleton);
    const bone = sideBone('foot', 'right');
    const matrix = skin.boneMatrix(bone, new Matrix4());
    const rotation = new Quaternion().setFromRotationMatrix(matrix);
    let checked = 0;
    for (let v = 0; v < mesh.vertexCount; v++) {
      const start = 4 * v;
      if (mesh.joints[start] !== bone || mesh.weights[start] !== 1) continue;
      const expected = at(restNormals, v).applyQuaternion(rotation);
      expect(at(skin.normals, v).distanceTo(expected)).toBeLessThan(POSITION_TOLERANCE);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('gives mirrored positions for a mirrored skeleton', () => {
    const { skin, mirrorOf, surfaceCount } = setup();
    const other = new BodySkin(setup().mesh);
    posedSkeletons().forEach((skeleton) => {
      skin.apply(skeleton);
      other.apply(mirrorSkeleton(skeleton));
      for (let v = 0; v < surfaceCount; v++) {
        const expected = at(skin.positions, v);
        expected.z = -expected.z;
        expect(at(other.positions, mirrorOf[v]).distanceTo(expected)).toBeLessThan(
          POSITION_TOLERANCE,
        );
      }
    });
  });

  it('skins a dense mesh quickly', () => {
    const { skin, mesh } = setup(BENCH_RINGS);
    const skeletons = posedSkeletons();
    skeletons.forEach((skeleton) => skin.apply(skeleton));
    const start = performance.now();
    for (let run = 0; run < BENCH_RUNS; run++) skin.apply(skeletons[run % skeletons.length]);
    const mean = (performance.now() - start) / BENCH_RUNS;
    console.info(`apply ${mesh.vertexCount} vertices: ${mean.toFixed(3)} ms`);
    expect(mean).toBeLessThan(BENCH_LIMIT_MS);
  });
});

describe('shoulder ballooning guard on the real mesh', () => {
  const mesh = decodeSkinMesh();

  function dominant(v: number): number {
    let best = 0;
    for (let i = 1; i < INFLUENCES; i++) {
      if (mesh.weights[v * INFLUENCES + i] > mesh.weights[v * INFLUENCES + best]) best = i;
    }
    return mesh.joints[v * INFLUENCES + best];
  }

  function reach(positions: Float32Array, shoulder: Vector3, id: 'right' | 'left'): number {
    let max = 0;
    for (let v = 0; v < mesh.vertexCount; v++) {
      const bone = dominant(v);
      if (!GUARD_BONES.some((name) => sideBone(name, id) === bone)) continue;
      max = Math.max(max, at(positions, v).distanceTo(shoulder));
    }
    return max;
  }

  it('keeps the shoulder region within the rest reach', () => {
    const skin = new BodySkin(mesh);
    GUARD_UNITS.forEach((units) => {
      const skeleton = readingSkeleton(units);
      skin.apply(skeleton);
      const report = SIDES.map((id) => {
        const restReach = reach(skin.restPositions, vec(skin.rest[id].shoulder), id);
        const posedReach = reach(skin.positions, skeleton.arms[id].shoulder, id);
        expect(posedReach).toBeLessThanOrEqual(GUARD_RATIO * restReach);
        return `${id} ${posedReach.toFixed(4)}/${restReach.toFixed(4)}`;
      });
      console.info(`guard units ${units}: ${report.join(', ')}`);
    });
  });
});

import { Vector3 } from 'three';

type Triple = readonly [number, number, number];

export const REST_JOINTS = {
  hip: [0.0054, 0.9239, 0.0868],
  knee: [-0.0212, 0.4742, 0.1409],
  ankle: [-0.0661, 0.04, 0.1909],
  ball: [0.0817, -0.0086, 0.2053],
  shoulder: [-0.0318, 1.4231, 0.1845],
  elbow: [-0.0179, 1.2291, 0.36],
  wrist: [0.1355, 1.1109, 0.5559],
  hand: [0.2338, 1.0124, 0.6682],
  neck: [0.0082, 1.4404, 0],
  head: [0.0374, 1.5374, 0],
  headTop: [0.0374, 1.7321, 0],
} as const satisfies Record<string, Triple>;

export const REST_FOOT = {
  heelBack: [-0.1206, 0.0028, 0.1854],
  toeTip: [0.1328, -0.0191, 0.1803],
  toeAxis: [0.9733, -0.004, 0.2295],
  toeBendAxis: [-0.2295, -0.017, 0.9732],
} as const satisfies Record<string, Triple>;

export const REST_SOLE_Y = -0.0304;

export type RestJoint = keyof typeof REST_JOINTS;

export function restJoint(name: RestJoint): Vector3 {
  return new Vector3(...REST_JOINTS[name]);
}

function between(a: RestJoint, b: RestJoint): number {
  return restJoint(a).distanceTo(restJoint(b));
}

const hips = restJoint('hip').setZ(0);
const shoulders = restJoint('shoulder').setZ(0);

function planar(point: Vector3, origin: Vector3): readonly [number, number] {
  return [point.x - origin.x, point.y - origin.y];
}

export const RIG_BODY = {
  hipHalfWidthM: REST_JOINTS.hip[2],
  thighM: between('hip', 'knee'),
  shankM: between('knee', 'ankle'),
  trunkM: shoulders.distanceTo(hips),
  shoulderOverHips: planar(shoulders, hips),
  neckOverShoulders: planar(restJoint('neck'), shoulders),
  shoulderHalfWidthM: REST_JOINTS.shoulder[2],
  upperArmM: between('shoulder', 'elbow'),
  forearmM: between('elbow', 'wrist'),
  handM: between('wrist', 'hand'),
  headTopAboveHeadM: REST_JOINTS.headTop[1] - REST_JOINTS.head[1],
} as const;

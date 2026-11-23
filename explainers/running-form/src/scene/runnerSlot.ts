import { Group, LatheGeometry, Matrix4, Mesh, SphereGeometry, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { GaitReading, GroupId, SideId } from '../ids';
import { SIDE_IDS } from '../ids';
import { FINISHES } from './finishes';
import type { Finish } from './finishes';
import type { PartContext } from './parts/context';
import type { RunnerPose } from './runnerPose';

export interface RunnerFigure {
  readonly root: Object3D;
  apply(pose: RunnerPose, reading: GaitReading): void;
  dispose(): void;
}

export type PoseSolver = (reading: GaitReading) => RunnerPose;

export type RunnerBuilder = (context: PartContext) => Steps<RunnerFigure>;

type Profile = readonly (readonly [radius: number, along: number])[];

const LATHE_SEGMENTS = 14;
const SPHERE_SEGMENTS = { width: 18, height: 12 } as const;
const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(0, 0, 1);

const PROFILES = {
  thigh: [
    [0, -0.05],
    [0.06, -0.035],
    [0.084, 0],
    [0.083, 0.1],
    [0.074, 0.22],
    [0.058, 0.34],
    [0.049, 0.42],
    [0.044, 0.45],
    [0.028, 0.47],
    [0, 0.48],
  ],
  shorts: [
    [0.088, -0.04],
    [0.09, 0],
    [0.088, 0.09],
    [0.086, 0.13],
  ],
  shin: [
    [0, -0.03],
    [0.044, -0.015],
    [0.05, 0.03],
    [0.057, 0.12],
    [0.049, 0.22],
    [0.035, 0.34],
    [0.029, 0.41],
    [0.031, 0.44],
    [0.02, 0.46],
    [0, 0.47],
  ],
  upperArm: [
    [0, -0.045],
    [0.04, -0.025],
    [0.047, 0.04],
    [0.042, 0.17],
    [0.035, 0.29],
    [0.03, 0.32],
    [0, 0.35],
  ],
  forearm: [
    [0, -0.025],
    [0.034, -0.005],
    [0.036, 0.06],
    [0.029, 0.18],
    [0.023, 0.26],
    [0.03, 0.3],
    [0.031, 0.34],
    [0.02, 0.37],
    [0, 0.38],
  ],
  torso: [
    [0, -0.04],
    [0.13, -0.02],
    [0.128, 0.08],
    [0.14, 0.2],
    [0.152, 0.3],
    [0.165, 0.4],
    [0.15, 0.47],
    [0.1, 0.52],
    [0.05, 0.56],
    [0, 0.57],
  ],
  neck: [
    [0, -0.02],
    [0.05, 0],
    [0.048, 0.1],
    [0.05, 0.14],
    [0, 0.16],
  ],
} as const satisfies Record<string, Profile>;

const NOMINAL = {
  thigh: 0.434,
  shin: 0.435,
  upperArm: 0.325,
  forearm: 0.275,
  torso: 0.55,
  neck: 0.14,
} as const;

const TORSO_DEPTH = 0.62;
const HEAD_SCALE = new Vector3(0.105, 0.118, 0.085);
const CAP_SCALE = new Vector3(0.11, 0.07, 0.092);
const CAP_LIFT_M = 0.035;
const BRIM_SCALE = new Vector3(0.075, 0.012, 0.075);
const BRIM_OFFSET = new Vector3(0.09, 0.04, 0);
const PELVIS_SCALE = new Vector3(0.115, 0.12, 0.175);
const PELVIS_LIFT_M = 0.03;
const SHOE_SCALE = new Vector3(0.145, 0.05, 0.05);
const SOLE_SCALE = new Vector3(0.15, 0.022, 0.054);
const SHOE_LIFT_M = 0.055;
const SOLE_LIFT_M = 0.02;

function lathe(profile: Profile): LatheGeometry {
  return new LatheGeometry(
    profile.map(([radius, along]) => new Vector2(radius, along)),
    LATHE_SEGMENTS,
  );
}

const basis = new Matrix4();
const axisX = new Vector3();
const axisY = new Vector3();
const axisZ = new Vector3();

function orient(object: Object3D, forward: Vector3, up: Vector3): void {
  axisY.copy(up).normalize();
  axisZ.crossVectors(forward, axisY).normalize();
  axisX.crossVectors(axisY, axisZ).normalize();
  basis.makeBasis(axisX, axisY, axisZ);
  object.quaternion.setFromRotationMatrix(basis);
}

const span = new Vector3();
const footForward = new Vector3();
const footUp = new Vector3();
const footMiddle = new Vector3();

function placeBetween(mesh: Mesh, from: Vector3, to: Vector3, nominal: number): void {
  span.subVectors(to, from);
  const length = span.length();
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(UP, span.divideScalar(Math.max(length, 1e-6)));
  mesh.scale.set(1, length / nominal, 1);
}

interface Limbs {
  readonly thigh: Mesh;
  readonly shorts: Mesh;
  readonly shin: Mesh;
  readonly upperArm: Mesh;
  readonly forearm: Mesh;
  readonly shoe: Mesh;
  readonly sole: Mesh;
}

class StandInRunner implements RunnerFigure {
  readonly root = new Group();
  private readonly context: PartContext;
  private readonly torso: Mesh;
  private readonly neck: Mesh;
  private readonly pelvis: Mesh;
  private readonly head: Group;
  private readonly limbs: Record<SideId, Limbs>;

  constructor(context: PartContext) {
    this.context = context;
    this.root.name = 'standInRunner';
    const track = <T extends BufferGeometry>(geometry: T): T => context.tracker.track(geometry);
    const sphere = track(new SphereGeometry(1, SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height));
    const shapes = {
      thigh: track(lathe(PROFILES.thigh)),
      shorts: track(lathe(PROFILES.shorts)),
      shin: track(lathe(PROFILES.shin)),
      upperArm: track(lathe(PROFILES.upperArm)),
      forearm: track(lathe(PROFILES.forearm)),
      torso: track(lathe(PROFILES.torso)),
      neck: track(lathe(PROFILES.neck)),
    };
    this.torso = this.mesh(shapes.torso, 'trunk', 'singlet');
    this.neck = this.mesh(shapes.neck, 'head', 'skin');
    this.pelvis = this.mesh(sphere, 'pelvis', 'shorts');
    this.pelvis.scale.copy(PELVIS_SCALE);
    this.head = new Group();
    const face = this.mesh(sphere, 'head', 'skin', this.head);
    face.scale.copy(HEAD_SCALE);
    const cap = this.mesh(sphere, 'head', 'cap', this.head);
    cap.scale.copy(CAP_SCALE);
    cap.position.y = CAP_LIFT_M;
    const brim = this.mesh(sphere, 'head', 'cap', this.head);
    brim.scale.copy(BRIM_SCALE);
    brim.position.copy(BRIM_OFFSET);
    this.root.add(this.head);
    const limbsOf = (side: SideId): Limbs => ({
      thigh: this.mesh(shapes.thigh, 'thigh', 'skin'),
      shorts: this.mesh(shapes.shorts, 'pelvis', 'shorts'),
      shin: this.mesh(shapes.shin, 'shin', 'skin'),
      upperArm: this.mesh(shapes.upperArm, 'arm', 'skin'),
      forearm: this.mesh(shapes.forearm, 'arm', 'skin'),
      shoe: this.mesh(sphere, 'shoe', side === 'right' ? 'rightShoe' : 'leftShoe'),
      sole: this.mesh(sphere, 'shoe', 'sole'),
    });
    this.limbs = { right: limbsOf('right'), left: limbsOf('left') };
  }

  apply(pose: RunnerPose): void {
    this.torso.position.copy(pose.pelvis);
    orient(this.torso, pose.trunkForward, pose.trunkUp);
    this.torso.scale.set(TORSO_DEPTH, pose.chest.distanceTo(pose.pelvis) / NOMINAL.torso, 1);
    placeBetween(this.neck, pose.chest, pose.headCentre, NOMINAL.neck);
    this.head.position.copy(pose.headCentre);
    orient(this.head, pose.trunkForward, span.subVectors(pose.headTop, pose.headCentre));
    this.placePelvis(pose);
    SIDE_IDS.forEach((side) => this.placeSide(pose, side));
  }

  dispose(): void {
    this.root.removeFromParent();
  }

  private placePelvis(pose: RunnerPose): void {
    const { right, left } = pose.legs;
    axisZ.subVectors(right.hip, left.hip).normalize();
    axisX.crossVectors(pose.trunkUp, axisZ).normalize();
    this.pelvis.position.copy(pose.pelvis).addScaledVector(pose.trunkUp, PELVIS_LIFT_M);
    orient(this.pelvis, axisX, axisY.crossVectors(axisZ, axisX));
  }

  private placeSide(pose: RunnerPose, side: SideId): void {
    const leg = pose.legs[side];
    const arm = pose.arms[side];
    const limbs = this.limbs[side];
    placeBetween(limbs.thigh, leg.hip, leg.knee, NOMINAL.thigh);
    placeBetween(limbs.shorts, leg.hip, leg.knee, NOMINAL.thigh);
    placeBetween(limbs.shin, leg.knee, leg.ankle, NOMINAL.shin);
    placeBetween(limbs.upperArm, arm.shoulder, arm.elbow, NOMINAL.upperArm);
    placeBetween(limbs.forearm, arm.elbow, arm.wrist, NOMINAL.forearm);
    footForward.subVectors(leg.toe, leg.heel).normalize();
    footUp.crossVectors(RIGHT, footForward).normalize();
    footMiddle.addVectors(leg.heel, leg.toe).multiplyScalar(0.5);
    this.placeShoe(limbs.shoe, SHOE_LIFT_M, SHOE_SCALE);
    this.placeShoe(limbs.sole, SOLE_LIFT_M, SOLE_SCALE);
  }

  private placeShoe(mesh: Mesh, lift: number, scale: Vector3): void {
    mesh.position.copy(footMiddle).addScaledVector(footUp, lift);
    orient(mesh, footForward, footUp);
    mesh.scale.copy(scale);
  }

  private material(group: GroupId, finish: Finish): Material {
    return this.context.materials.get(group, FINISHES[finish]);
  }

  private mesh(
    geometry: BufferGeometry,
    group: GroupId,
    finish: Finish,
    parent: Object3D = this.root,
  ): Mesh {
    const mesh = new Mesh(geometry, this.material(group, finish));
    parent.add(mesh);
    return mesh;
  }
}

export function* buildStandInRunner(context: PartContext): Steps<RunnerFigure> {
  yield;
  return new StandInRunner(context);
}

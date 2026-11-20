import { Group, Matrix4, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ArmId, PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { BODY } from '../../rig/constants';
import { SIDE } from '../../rig/skeleton';
import type { ArmPose, LegPose, Skeleton } from '../../rig/skeleton';
import type { PartContext } from '../context';
import {
  UP,
  bandGeometry,
  capGeometry,
  ellipsoid,
  footGeometry,
  handGeometry,
  lensGeometry,
  limbGeometry,
  neckGeometry,
} from './geometry';
import { HAND, HEAD, JOINTS } from './shapes';
import { Torso } from './torso';

const SIDE_FINISH: Readonly<Record<ArmId, Finish>> = { right: 'skinRight', left: 'skinLeft' };
const HIP_LABEL = [-0.5, 0.02, 0.17] as const;
const FOOT_LABEL_SHARE = 0.4;

interface ArmMeshes {
  readonly deltoid: Mesh;
  readonly upper: Mesh;
  readonly elbow: Mesh;
  readonly forearm: Mesh;
  readonly hand: Mesh;
}

interface LegMeshes {
  readonly thigh: Mesh;
  readonly sleeve: Mesh;
  readonly knee: Mesh;
  readonly shank: Mesh;
  readonly foot: Mesh;
}

const direction = new Vector3();
const across = new Vector3();
const basis = new Matrix4();

function placeSegment(mesh: Mesh, from: Vector3, to: Vector3): void {
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(UP, direction.subVectors(to, from).normalize());
}

function placeFlat(mesh: Mesh, origin: Vector3, length: Vector3, normal: Vector3): void {
  mesh.position.copy(origin);
  across.crossVectors(length, normal).normalize();
  mesh.quaternion.setFromRotationMatrix(basis.makeBasis(across, length, normal));
}

export class Swimmer {
  readonly root = new Group();
  readonly labels = new Map<PartId, Object3D>();
  readonly rightHand: Object3D;
  readonly head = new Group();
  private readonly context: PartContext;
  private readonly torso: Torso;
  private readonly hipLabel: Object3D;
  private readonly arms: Record<ArmId, ArmMeshes>;
  private readonly legs: Record<ArmId, LegMeshes>;
  private readonly shared: Record<
    'upper' | 'forearm' | 'thigh' | 'sleeve' | 'shank' | 'foot' | 'elbow' | 'knee' | 'deltoid',
    BufferGeometry
  >;

  constructor(context: PartContext) {
    this.context = context;
    this.root.name = 'swimmer';
    const track = context.tracker.track.bind(context.tracker);
    this.shared = {
      upper: track(limbGeometry('upperArm')),
      forearm: track(limbGeometry('forearm')),
      thigh: track(limbGeometry('thigh')),
      sleeve: track(limbGeometry('sleeve')),
      shank: track(limbGeometry('shank')),
      foot: track(footGeometry()),
      elbow: track(ellipsoid([JOINTS.elbow, JOINTS.elbow, JOINTS.elbow], [0, 0, 0])),
      knee: track(ellipsoid([JOINTS.knee, JOINTS.knee, JOINTS.knee], [0, 0, 0])),
      deltoid: track(ellipsoid([JOINTS.shoulder, JOINTS.shoulder, JOINTS.shoulder], [0, 0, 0])),
    };
    this.torso = new Torso(
      this.root,
      {
        pelvis: this.material('hips', 'suit'),
        abdomen: this.material(STRUCTURE_GROUP, 'torso'),
        chest: this.material('shoulder', 'torso'),
      },
      track,
    );
    this.hipLabel = this.label('hips', this.torso.pelvis, [...HIP_LABEL]);
    this.arms = { right: this.buildArm('right'), left: this.buildArm('left') };
    this.legs = { right: this.buildLeg('right'), left: this.buildLeg('left') };
    this.buildHead();
    this.rightHand = this.label('hand', this.arms.right.hand, [0, HAND.length / 2, 0]);
    this.label('forearm', this.arms.right.forearm, [0, BODY.forearm / 2, 0]);
    this.label('elbow', this.arms.right.elbow, [0, 0, 0]);
    this.label('shoulder', this.arms.right.deltoid, [0, 0, 0]);
    this.label('foot', this.legs.right.foot, [0, BODY.foot * FOOT_LABEL_SHARE, 0]);
  }

  apply(skeleton: Skeleton): void {
    this.torso.twist(skeleton.hipRollRad, skeleton.shoulderRollRad);
    const [x, y, z] = HIP_LABEL;
    const cos = Math.cos(skeleton.hipRollRad);
    const sin = Math.sin(skeleton.hipRollRad);
    this.hipLabel.position.set(x, y * cos - z * sin, y * sin + z * cos);
    (['right', 'left'] as const).forEach((id) => {
      this.applyArm(this.arms[id], skeleton.arms[id]);
      this.applyLeg(this.legs[id], skeleton.legs[id]);
    });
    this.head.position.copy(skeleton.neck);
    this.head.quaternion.copy(skeleton.head);
  }

  private material(group: string, finish: Finish): Material {
    return this.context.materials.get(group, FINISHES[finish]);
  }

  private mesh(
    geometry: BufferGeometry,
    group: string,
    finish: Finish,
    parent: Object3D = this.root,
  ): Mesh {
    const mesh = new Mesh(geometry, this.material(group, finish));
    parent.add(mesh);
    return mesh;
  }

  private label(id: PartId, parent: Object3D, at: number[]): Object3D {
    const anchor = anchorAt(parent, at[0], at[1], at[2]);
    this.labels.set(id, anchor);
    return anchor;
  }

  private buildArm(id: ArmId): ArmMeshes {
    const skin = SIDE_FINISH[id];
    return {
      deltoid: this.mesh(this.shared.deltoid, 'shoulder', 'torso'),
      upper: this.mesh(this.shared.upper, 'elbow', skin),
      elbow: this.mesh(this.shared.elbow, 'elbow', skin),
      forearm: this.mesh(this.shared.forearm, 'forearm', skin),
      hand: this.mesh(this.context.tracker.track(handGeometry(SIDE[id])), 'hand', skin),
    };
  }

  private buildLeg(id: ArmId): LegMeshes {
    const skin = SIDE_FINISH[id];
    return {
      thigh: this.mesh(this.shared.thigh, 'foot', skin),
      sleeve: this.mesh(this.shared.sleeve, 'hips', 'suit'),
      knee: this.mesh(this.shared.knee, 'foot', skin),
      shank: this.mesh(this.shared.shank, 'foot', skin),
      foot: this.mesh(this.shared.foot, 'foot', skin),
    };
  }

  private buildHead(): void {
    const track = this.context.tracker.track.bind(this.context.tracker);
    this.root.add(this.head);
    this.mesh(track(neckGeometry()), 'head', 'torso', this.head);
    this.mesh(track(ellipsoid(HEAD.skull.radii, HEAD.skull.centre)), 'head', 'torso', this.head);
    this.mesh(track(ellipsoid(HEAD.jaw.radii, HEAD.jaw.centre)), 'head', 'torso', this.head);
    const cap = this.mesh(track(capGeometry()), 'head', 'cap', this.head);
    this.mesh(track(bandGeometry()), 'head', 'goggleBand', this.head);
    this.mesh(track(lensGeometry()), 'head', 'goggleLens', this.head);
    this.label('head', cap, [...HEAD.anchor]);
  }

  private applyArm(meshes: ArmMeshes, pose: ArmPose): void {
    meshes.deltoid.position.copy(pose.shoulder);
    placeSegment(meshes.upper, pose.shoulder, pose.elbow);
    meshes.elbow.position.copy(pose.elbow);
    placeSegment(meshes.forearm, pose.elbow, pose.wrist);
    placeFlat(meshes.hand, pose.wrist, pose.handAxis, pose.palm);
  }

  private applyLeg(meshes: LegMeshes, pose: LegPose): void {
    placeSegment(meshes.thigh, pose.hip, pose.knee);
    placeSegment(meshes.sleeve, pose.hip, pose.knee);
    meshes.knee.position.copy(pose.knee);
    placeSegment(meshes.shank, pose.knee, pose.ankle);
    placeFlat(meshes.foot, pose.ankle, pose.footAxis, pose.sole);
  }
}

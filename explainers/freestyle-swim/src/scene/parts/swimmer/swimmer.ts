import { Group } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { ArmId, PartId } from '../../../ids';
import { BODY } from '../../rig/constants';
import { SIDE } from '../../rig/skeleton';
import type { ArmPose, LegPose, Skeleton } from '../../rig/skeleton';
import type { PartContext } from '../context';
import { PartBuilder } from './build';
import { footGeometry } from './feet';
import { handGeometry, wristbandGeometry } from './hands';
import {
  capGeometry,
  capStripeGeometry,
  gogglesFrameGeometry,
  headSkinGeometry,
  lensGeometry,
} from './head';
import { deltoidGeometry, jointGeometry, limbGeometry, sleeveGeometry } from './limbs';
import { Placer } from './placement';
import { HAND, HEAD } from './shapes';
import { Torso } from './torso';

const HIP_LABEL = [-0.5, 0.02, 0.17] as const;
const FOOT_LABEL_SHARE = 0.4;
const ORIGIN = [0, 0, 0] as const;
const ARM_IDS: readonly ArmId[] = ['right', 'left'];

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

interface Shared {
  readonly upper: BufferGeometry;
  readonly forearm: BufferGeometry;
  readonly thigh: BufferGeometry;
  readonly sleeve: BufferGeometry;
  readonly shank: BufferGeometry;
  readonly elbow: BufferGeometry;
  readonly knee: BufferGeometry;
  readonly deltoid: BufferGeometry;
}

function sharedGeometries(): Shared {
  return {
    upper: limbGeometry('upperArm'),
    forearm: limbGeometry('forearm'),
    thigh: limbGeometry('thigh'),
    sleeve: sleeveGeometry(),
    shank: limbGeometry('shank'),
    elbow: jointGeometry('elbow'),
    knee: jointGeometry('knee'),
    deltoid: deltoidGeometry(),
  };
}

export class Swimmer {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly rightHand: Object3D;
  readonly head: Group;
  private readonly torso: Torso;
  private readonly hipLabel: Object3D;
  private readonly arms: Record<ArmId, ArmMeshes>;
  private readonly legs: Record<ArmId, LegMeshes>;
  private readonly placer = new Placer();

  constructor(parts: {
    root: Group;
    head: Group;
    labels: ReadonlyMap<PartId, Object3D>;
    torso: Torso;
    hipLabel: Object3D;
    arms: Record<ArmId, ArmMeshes>;
    legs: Record<ArmId, LegMeshes>;
  }) {
    this.root = parts.root;
    this.head = parts.head;
    this.labels = parts.labels;
    this.torso = parts.torso;
    this.hipLabel = parts.hipLabel;
    this.arms = parts.arms;
    this.legs = parts.legs;
    this.rightHand = this.labels.get('hand') as Object3D;
  }

  apply(skeleton: Skeleton): void {
    this.torso.twist(skeleton.hipRollRad, skeleton.shoulderRollRad);
    const [x, y, z] = HIP_LABEL;
    const cos = Math.cos(skeleton.hipRollRad);
    const sin = Math.sin(skeleton.hipRollRad);
    this.hipLabel.position.set(x, y * cos - z * sin, y * sin + z * cos);
    ARM_IDS.forEach((id) => {
      this.applyArm(this.arms[id], skeleton.arms[id]);
      this.applyLeg(this.legs[id], skeleton.legs[id]);
    });
    this.head.position.copy(skeleton.neck);
    this.head.quaternion.copy(skeleton.head);
  }

  private applyArm(meshes: ArmMeshes, pose: ArmPose): void {
    const { placer } = this;
    placer.between(meshes.upper, pose.shoulder, pose.elbow, pose.palm);
    meshes.deltoid.position.copy(pose.shoulder);
    meshes.deltoid.quaternion.copy(meshes.upper.quaternion);
    meshes.elbow.position.copy(pose.elbow);
    placer.between(meshes.forearm, pose.elbow, pose.wrist, pose.palm);
    placer.place(meshes.hand, pose.wrist, pose.handAxis, pose.palm);
  }

  private applyLeg(meshes: LegMeshes, pose: LegPose): void {
    const { placer } = this;
    placer.between(meshes.thigh, pose.hip, pose.knee, pose.sole);
    meshes.sleeve.position.copy(meshes.thigh.position);
    meshes.sleeve.quaternion.copy(meshes.thigh.quaternion);
    meshes.knee.position.copy(pose.knee);
    placer.between(meshes.shank, pose.knee, pose.ankle, pose.sole);
    placer.place(meshes.foot, pose.ankle, pose.footAxis, pose.sole);
  }
}

function buildTorso(builder: PartBuilder, root: Group): Torso {
  return new Torso(
    root,
    {
      pelvis: builder.material('hips', 'suit'),
      abdomen: builder.material(STRUCTURE_GROUP, 'skin'),
      chest: builder.material('shoulder', 'skin'),
    },
    builder.track.bind(builder),
  );
}

function buildHead(builder: PartBuilder, root: Group): Group {
  const head = new Group();
  root.add(head);
  builder.mesh(headSkinGeometry(), 'head', 'skin', head);
  const cap = builder.mesh(capGeometry(), 'head', 'cap', head);
  builder.mesh(capStripeGeometry(), 'head', 'capStripe', head);
  builder.mesh(gogglesFrameGeometry(), 'head', 'goggleBand', head);
  builder.mesh(lensGeometry(), 'head', 'goggleLens', head);
  builder.label('head', cap, HEAD.anchor);
  return head;
}

function buildArm(builder: PartBuilder, shared: Shared, root: Group, id: ArmId): ArmMeshes {
  const hand = builder.mesh(handGeometry(SIDE[id]), 'hand', 'skin', root);
  if (id === 'right') builder.mesh(wristbandGeometry(), 'hand', 'wristband', hand);
  return {
    deltoid: builder.mesh(shared.deltoid, 'shoulder', 'skin', root),
    upper: builder.mesh(shared.upper, 'elbow', 'skin', root),
    elbow: builder.mesh(shared.elbow, 'elbow', 'skin', root),
    forearm: builder.mesh(shared.forearm, 'forearm', 'skin', root),
    hand,
  };
}

function buildLeg(builder: PartBuilder, shared: Shared, root: Group, id: ArmId): LegMeshes {
  return {
    thigh: builder.mesh(shared.thigh, 'foot', 'skin', root),
    sleeve: builder.mesh(shared.sleeve, 'hips', 'suit', root),
    knee: builder.mesh(shared.knee, 'foot', 'skin', root),
    shank: builder.mesh(shared.shank, 'foot', 'skin', root),
    foot: builder.mesh(footGeometry(SIDE[id]), 'foot', 'skin', root),
  };
}

export function* buildSwimmer(context: PartContext): Steps<Swimmer> {
  const builder = new PartBuilder(context);
  const root = new Group();
  root.name = 'swimmer';
  const shared = sharedGeometries();
  const torso = buildTorso(builder, root);
  const hipLabel = builder.label('hips', torso.pelvis, HIP_LABEL);
  yield;
  const head = buildHead(builder, root);
  yield;
  const arms = { right: buildArm(builder, shared, root, 'right') } as Record<ArmId, ArmMeshes>;
  yield;
  arms.left = buildArm(builder, shared, root, 'left');
  yield;
  const legs = { right: buildLeg(builder, shared, root, 'right') } as Record<ArmId, LegMeshes>;
  yield;
  legs.left = buildLeg(builder, shared, root, 'left');
  builder.label('hand', arms.right.hand, [0, HAND.length / 2, 0]);
  builder.label('forearm', arms.right.forearm, [0, BODY.forearm / 2, 0]);
  builder.label('elbow', arms.right.elbow, ORIGIN);
  builder.label('shoulder', arms.right.deltoid, ORIGIN);
  builder.label('foot', legs.right.foot, [0, BODY.foot * FOOT_LABEL_SHARE, 0]);
  return new Swimmer({ root, head, labels: builder.labels, torso, hipLabel, arms, legs });
}

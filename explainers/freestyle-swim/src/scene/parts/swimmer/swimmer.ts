import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { PartId } from '../../../ids';
import type { Finish } from '../../finishes';
import { BODY } from '../../rig/constants';
import type { Skeleton } from '../../rig/skeleton';
import type { PartContext } from '../context';
import { BodySurface } from './bodySurface';
import { PartBuilder } from './build';
import { buildGoggles, buildWristband } from './gear';
import { restSkeleton } from './restSkeleton';
import { BodySkin } from './skin/bodySkin';
import { decodeSkinMesh } from './skin/decode';
import { centreBone, sideBone } from './skin/types';
import type { SlotId } from './skin/types';

const SLOT_LOOK: Readonly<Record<SlotId, readonly [string, Finish]>> = {
  hand: ['hand', 'skin'],
  forearm: ['forearm', 'skin'],
  upperArm: ['elbow', 'skin'],
  chest: ['shoulder', 'skin'],
  abdomen: [STRUCTURE_GROUP, 'skin'],
  jammers: ['hips', 'suit'],
  legSuit: ['foot', 'suit'],
  leg: ['foot', 'skin'],
  face: ['head', 'skin'],
  cap: ['head', 'cap'],
  capStripe: ['head', 'capStripe'],
};

const LABEL_IDS = ['hand', 'forearm', 'elbow', 'shoulder', 'head', 'hips', 'foot'] as const;
const HIP_LABEL = [-0.5, 0.02, 0.17] as const;
const FOOT_LABEL_SHARE = 0.4;
const ORIGIN = [0, 0, 0] as const;
const HEAD_BONE = centreBone('head');
const BAND_BONE = sideBone('forearm', 'right');

type LabelId = (typeof LABEL_IDS)[number];

interface SwimmerParts {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly skin: BodySkin;
  readonly surface: BodySurface;
  readonly goggles: Object3D;
  readonly wristband: Object3D;
}

export class Swimmer {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly rightHand: Object3D;
  private readonly skin: BodySkin;
  private readonly surface: BodySurface;
  private readonly goggles: Object3D;
  private readonly wristband: Object3D;
  private readonly headTop: Vector3;

  constructor(parts: SwimmerParts) {
    this.root = parts.root;
    this.labels = parts.labels;
    this.skin = parts.skin;
    this.surface = parts.surface;
    this.goggles = parts.goggles;
    this.wristband = parts.wristband;
    this.rightHand = this.label('hand');
    this.headTop = new Vector3(...this.skin.rest.headTop);
  }

  apply(skeleton: Skeleton): void {
    this.skin.apply(skeleton);
    this.surface.update(this.skin);
    this.follow(this.goggles, HEAD_BONE);
    this.follow(this.wristband, BAND_BONE);
    this.placeLabels(skeleton);
  }

  private follow(object: Object3D, bone: number): void {
    this.skin.boneMatrix(bone, object.matrix);
    object.matrixWorldNeedsUpdate = true;
  }

  private label(id: LabelId): Object3D {
    return this.labels.get(id) as Object3D;
  }

  private placeLabels(skeleton: Skeleton): void {
    const arm = skeleton.arms.right;
    const leg = skeleton.legs.right;
    this.label('hand').position.copy(arm.hand);
    this.label('forearm').position.lerpVectors(arm.elbow, arm.wrist, 0.5);
    this.label('elbow').position.copy(arm.elbow);
    this.label('shoulder').position.copy(arm.shoulder);
    this.label('head').position.copy(this.headTop).applyMatrix4(this.goggles.matrix);
    this.label('foot')
      .position.copy(leg.ankle)
      .addScaledVector(leg.footAxis, BODY.foot * FOOT_LABEL_SHARE);
    const [x, y, z] = HIP_LABEL;
    const cos = Math.cos(skeleton.hipRollRad);
    const sin = Math.sin(skeleton.hipRollRad);
    this.label('hips').position.set(x, y * cos - z * sin, y * sin + z * cos);
  }
}

export function* buildSwimmer(context: PartContext): Steps<Swimmer> {
  const builder = new PartBuilder(context);
  const root = new Group();
  root.name = 'swimmer';
  const mesh = decodeSkinMesh();
  yield;
  const skin = new BodySkin(mesh);
  yield;
  skin.apply(restSkeleton(skin.rest));
  yield;
  const surface = new BodySurface(skin, {
    slots: mesh.slots,
    materialOf: (slot) => builder.material(...SLOT_LOOK[slot]),
    track: (item) => builder.track(item),
    parent: root,
  });
  const goggles = buildGoggles(builder, skin.rest, root);
  yield;
  const wristband = buildWristband(builder, skin.rest, skin.restPositions, root);
  LABEL_IDS.forEach((id) => builder.label(id, root, ORIGIN));
  return new Swimmer({ root, labels: builder.labels, skin, surface, goggles, wristband });
}

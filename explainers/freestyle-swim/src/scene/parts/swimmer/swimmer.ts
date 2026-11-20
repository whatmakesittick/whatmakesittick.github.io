import { Group, Vector3 } from 'three';
import type { Object3D, Matrix4 } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { PartId } from '../../../ids';
import { BODY } from '../../rig/constants';
import type { Skeleton } from '../../rig/skeleton';
import type { PartContext } from '../context';
import { PartBuilder } from './build';
import { FigureBody } from './figureBody';
import type { FigureRig } from './figure/figureRig';

const LABEL_IDS = ['hand', 'forearm', 'elbow', 'shoulder', 'head', 'hips', 'foot'] as const;
const HIP_LABEL = [-0.5, 0.02, 0.17] as const;
const FOOT_LABEL_SHARE = 0.4;
const ORIGIN = [0, 0, 0] as const;
const AXES = 3;
const HEAD_TOP = 'c_head_null';
const HEAD_BASE = 'c_head';

interface SwimmerParts {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly body: FigureBody;
  readonly rig: FigureRig;
  readonly toRig: Matrix4;
}

export class Swimmer {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly rightHand: Object3D;
  readonly headCentre = new Vector3();
  private readonly body: FigureBody;
  private readonly rig: FigureRig;
  private readonly toRig: Matrix4;
  private readonly top = new Vector3();

  constructor(parts: SwimmerParts) {
    this.root = parts.root;
    this.labels = parts.labels;
    this.body = parts.body;
    this.rig = parts.rig;
    this.toRig = parts.toRig;
    this.rightHand = this.label('hand');
  }

  apply(skeleton: Skeleton): void {
    this.rig.pose(skeleton);
    this.body.update();
    this.placeHead();
    this.placeLabels(skeleton);
  }

  private label(id: (typeof LABEL_IDS)[number]): Object3D {
    return this.labels.get(id) as Object3D;
  }

  private joint(name: string, out: Vector3): Vector3 {
    const { figure } = this.rig;
    return out
      .fromArray(figure.jointPositions, figure.jointIndex(name) * AXES)
      .applyMatrix4(this.toRig);
  }

  private placeHead(): void {
    this.joint(HEAD_TOP, this.top);
    this.joint(HEAD_BASE, this.headCentre).lerp(this.top, 0.5);
  }

  private placeLabels(skeleton: Skeleton): void {
    const arm = skeleton.arms.right;
    const leg = skeleton.legs.right;
    this.label('hand').position.copy(arm.hand);
    this.label('forearm').position.lerpVectors(arm.elbow, arm.wrist, 0.5);
    this.label('elbow').position.copy(arm.elbow);
    this.label('shoulder').position.copy(arm.shoulder);
    this.label('head').position.copy(this.top);
    this.label('foot')
      .position.copy(leg.ankle)
      .addScaledVector(leg.footAxis, BODY.foot * FOOT_LABEL_SHARE);
    const [x, y, z] = HIP_LABEL;
    const cos = Math.cos(skeleton.hipRollRad);
    const sin = Math.sin(skeleton.hipRollRad);
    this.label('hips').position.set(x, y * cos - z * sin, y * sin + z * cos);
  }
}

export function* buildSwimmer(context: PartContext, rig: FigureRig): Steps<Swimmer> {
  const builder = new PartBuilder(context);
  const root = new Group();
  root.name = 'swimmer';
  yield;
  const body = new FigureBody({
    figure: rig.figure,
    toRig: rig.toRig,
    track: (item) => builder.track(item),
    materialOf: (part) => builder.material(part, 'skin'),
  });
  root.add(body.mesh);
  LABEL_IDS.forEach((id) => builder.label(id, root, ORIGIN));
  yield;
  return new Swimmer({ root, labels: builder.labels, body, rig, toRig: rig.toRig });
}

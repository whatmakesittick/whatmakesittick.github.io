import { Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { PartId } from '../../state';
import { FORCE_ARROWS } from '../constants';
import { FORCE_FINISHES } from '../finishes';
import { arrowHead, unitShaft } from '../geometry/primitives';
import type { Attitude } from './glider';
import type { PartContext } from './context';

export type ForceId = Extract<PartId, 'lift' | 'weight' | 'drag'>;

export interface ForceShares {
  lift: number;
  drag: number;
}

interface Arrow {
  object: Group;
  shaft: Mesh;
  head: Mesh;
  anchor: Object3D;
}

const ATTITUDE_ORDER = 'YZX';
const POINT_DOWN = Math.PI;
const POINT_BACK = Math.PI / 2;

export class ForceArrows {
  readonly object = new Group();
  readonly anchors: Record<ForceId, Object3D>;
  private readonly aligned = new Group();
  private readonly arrows: Record<ForceId, Arrow>;

  constructor(context: PartContext) {
    this.aligned.rotation.order = ATTITUDE_ORDER;
    this.object.add(this.aligned);
    this.arrows = {
      lift: this.createArrow(context, 'lift', this.aligned),
      weight: this.createArrow(context, 'weight', this.object),
      drag: this.createArrow(context, 'drag', this.aligned),
    };
    this.arrows.weight.object.rotation.z = POINT_DOWN;
    this.arrows.drag.object.rotation.z = POINT_BACK;
    this.arrows.drag.object.position.y = FORCE_ARROWS.dragDrop;
    this.setLength(this.arrows.weight, FORCE_ARROWS.weightLength);
    this.anchors = {
      lift: this.arrows.lift.anchor,
      weight: this.arrows.weight.anchor,
      drag: this.arrows.drag.anchor,
    };
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(attitude: Attitude, shares: ForceShares): void {
    this.aligned.rotation.set(attitude.bank, -attitude.heading, attitude.pitch);
    this.setLength(this.arrows.lift, FORCE_ARROWS.weightLength * shares.lift);
    this.setLength(this.arrows.drag, FORCE_ARROWS.weightLength * shares.drag);
  }

  private createArrow(context: PartContext, id: ForceId, parent: Object3D): Arrow {
    const material = context.tracker.track(new MeshStandardMaterial(FORCE_FINISHES[id]));
    const shaft = new Mesh(context.tracker.track(unitShaft(FORCE_ARROWS)), material);
    const head = new Mesh(context.tracker.track(arrowHead(FORCE_ARROWS)), material);
    const anchor = new Object3D();
    const object = new Group();
    object.add(shaft, head, anchor);
    parent.add(object);
    return { object, shaft, head, anchor };
  }

  private setLength(arrow: Arrow, length: number): void {
    arrow.shaft.scale.y = Math.max(0, length - FORCE_ARROWS.headLength);
    arrow.head.position.y = length;
    arrow.anchor.position.y = length + FORCE_ARROWS.labelLift;
  }
}

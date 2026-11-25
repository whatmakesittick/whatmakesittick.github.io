import { ConeGeometry, CylinderGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import type { Material } from 'three';
import { formatFixed } from '@core/format';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { AssemblyState } from '../../../ids';
import { THEME } from '../../../theme';
import { LAYER } from '../../constants';
import { FINISHES } from '../../finishes';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FORCE_ARROW_NAME } from './names';
import { FadedOverlay } from './fadedOverlay';
import { OverlayTag } from './tag';

export const FORCE_ARROW_M_PER_BW = 0.28;

const SHAFT = { tail: 0.011, neck: 0.014, segments: 16 } as const;
const HEAD = { radius: 0.032, length: 0.09, segments: 24 } as const;
const WEIGHT_THICKNESS = 0.55;
const WEIGHT_BESIDE_M = 0.24;
const PRESENT_BW = 0.35;
const LEAN_BW = 0.04;
const TAG_FROM_SHARE = 0.6;
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
const align = new Quaternion();

interface Arrow {
  readonly root: Group;
  readonly shaft: Mesh;
  readonly head: Mesh;
}

export class ForceArrow extends FadedOverlay {
  private readonly force: Arrow;
  private readonly weight: Arrow;
  private readonly valueTag = new OverlayTag(THEME.forceArrow);
  private readonly leanTag = new OverlayTag(THEME.forceArrow);
  private readonly weightTag = new OverlayTag(THEME.bodyWeightArrow);
  private readonly origin = new Vector3();
  private readonly direction = new Vector3();
  private readonly weightTop = new Vector3();

  constructor(context: PartContext) {
    super('forces');
    this.root.name = FORCE_ARROW_NAME;
    const shaft = context.tracker.track(
      new CylinderGeometry(SHAFT.neck, SHAFT.tail, 1, SHAFT.segments).translate(0, 0.5, 0),
    );
    const head = context.tracker.track(
      new ConeGeometry(HEAD.radius, HEAD.length, HEAD.segments).translate(0, -HEAD.length / 2, 0),
    );
    const build = (material: Material): Arrow => {
      const arrow = {
        root: new Group(),
        shaft: new Mesh(shaft, material),
        head: new Mesh(head, material),
      };
      arrow.shaft.renderOrder = LAYER.overlay;
      arrow.head.renderOrder = LAYER.overlay;
      arrow.root.add(arrow.shaft, arrow.head);
      this.root.add(arrow.root);
      return arrow;
    };
    this.force = build(context.materials.get(UNDIMMED_GROUP, FINISHES.forceArrow));
    this.weight = build(context.materials.get(UNDIMMED_GROUP, FINISHES.bodyWeightArrow));
    this.force.root.add(this.valueTag.object, this.leanTag.object);
    this.weight.root.add(this.weightTag.object);
  }

  tags(): readonly OverlayTag[] {
    return [this.valueTag, this.leanTag, this.weightTag];
  }

  dispose(): void {
    [this.valueTag, this.leanTag, this.weightTag].forEach((tag) => tag.dispose());
  }

  protected render(state: AssemblyState, pose: RunnerPose, share: number): void {
    const { force } = state.reading;
    const foot = force.onFoot ? pose.legs[force.onFoot] : null;
    const contact = foot?.contact ?? null;
    const presence = smoothstep(force.vertBW / PRESENT_BW);
    const grow = share * presence;
    this.force.root.visible = contact !== null && grow > 0;
    this.weight.root.visible = this.force.root.visible;
    if (!contact || grow <= 0) return;
    this.origin.copy(contact);
    this.direction.set(force.fwdBW, force.vertBW, force.rightBW);
    const lengthM = this.direction.length() * FORCE_ARROW_M_PER_BW;
    this.place(this.force, this.origin, this.direction.normalize(), lengthM, grow, 1);
    this.weightTop.set(contact.x, pose.pelvis.y, contact.z + WEIGHT_BESIDE_M);
    this.place(this.weight, this.weightTop, DOWN, FORCE_ARROW_M_PER_BW, grow, WEIGHT_THICKNESS);
    this.showTags(force.vertBW, force.fwdBW, lengthM, grow);
  }

  private showTags(vertBW: number, fwdBW: number, lengthM: number, opacity: number): void {
    const share = smoothstep((opacity - TAG_FROM_SHARE) / (1 - TAG_FROM_SHARE));
    if (share <= 0) {
      this.tags().forEach((tag) => tag.hide());
      return;
    }
    this.valueTag.show('overlay.forceNow', { value: formatFixed(vertBW, 1) });
    this.valueTag.object.position.set(0, lengthM, 0);
    const leaning = Math.abs(fwdBW) > LEAN_BW;
    if (leaning) this.leanTag.show(fwdBW < 0 ? 'overlay.braking' : 'overlay.pushing');
    else this.leanTag.hide();
    this.leanTag.object.position.set(0, lengthM * 0.45, 0);
    this.weightTag.show('overlay.bodyWeight');
    this.weightTag.object.position.set(0, 0, 0);
    this.tags().forEach((tag) => tag.setOpacity(share));
  }

  private place(
    arrow: Arrow,
    origin: Vector3,
    direction: Vector3,
    lengthM: number,
    grow: number,
    thickness: number,
  ): void {
    const headLength = HEAD.length * thickness;
    const length = Math.max(lengthM, headLength * 1.2);
    arrow.root.position.copy(origin);
    arrow.root.quaternion.copy(align.setFromUnitVectors(UP, direction));
    arrow.root.scale.setScalar(grow);
    arrow.shaft.scale.set(thickness, length - headLength, thickness);
    arrow.head.scale.setScalar(thickness);
    arrow.head.position.y = length;
  }
}

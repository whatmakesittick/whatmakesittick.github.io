import { ConeGeometry, CylinderGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { clamp, smoothstep } from '@core/math';
import type { ArmId, AssemblyState } from '../../ids';
import type { Skeleton } from '../rig/skeleton';
import { FINISHES } from '../finishes';
import type { PartContext } from './context';

const FORCE_SCALE_M_PER_N = 0.005;
const FOREARM_SHARE = 0.4;
const SHAFT_RADIUS = 0.012;
const HEAD_RADIUS = 0.03;
const HEAD_LENGTH = 0.07;
const RADIAL_SEGMENTS = 10;
const EASE_SECONDS = 0.3;
const ENTRY_CATCH_SHOWN_FROM = 0.6;
const DRAG_ORIGIN = new Vector3(0.42, -0.05, 0);
const FORWARD = new Vector3(1, 0, 0);
const BACKWARD = new Vector3(-1, 0, 0);
const UP = new Vector3(0, 1, 0);
const ALIGN = new Quaternion();
const ARMS: readonly ArmId[] = ['right', 'left'];

interface Arrow {
  readonly root: Group;
  readonly shaft: Mesh;
  readonly head: Mesh;
}

function pushesForward(state: AssemblyState, arm: ArmId): boolean {
  const { phase, progress } = state.reading[arm];
  if (phase === 'pull' || phase === 'push') return true;
  return phase === 'entryCatch' && progress > ENTRY_CATCH_SHOWN_FROM;
}

export class ForceArrows {
  readonly root = new Group();
  private readonly hands: Record<ArmId, Arrow>;
  private readonly forearms: Record<ArmId, Arrow>;
  private readonly drag: Arrow;
  private state: AssemblyState | null = null;
  private skeleton: Skeleton | null = null;
  private share = 0;
  private target = 0;
  private readonly middle = new Vector3();

  constructor(context: PartContext) {
    const shaft = context.tracker.track(
      new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, 1, RADIAL_SEGMENTS),
    );
    shaft.translate(0, 0.5, 0);
    const head = context.tracker.track(new ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, RADIAL_SEGMENTS));
    head.translate(0, -HEAD_LENGTH / 2, 0);
    const thrust = context.materials.get(UNDIMMED_GROUP, FINISHES.thrust);
    const dragMaterial = context.materials.get(UNDIMMED_GROUP, FINISHES.drag);
    const build = (material: typeof thrust): Arrow => {
      const arrow = {
        root: new Group(),
        shaft: new Mesh(shaft, material),
        head: new Mesh(head, material),
      };
      arrow.root.add(arrow.shaft, arrow.head);
      this.root.add(arrow.root);
      return arrow;
    };
    this.hands = { right: build(thrust), left: build(thrust) };
    this.forearms = { right: build(thrust), left: build(thrust) };
    this.drag = build(dragMaterial);
    this.root.visible = false;
  }

  setState(state: AssemblyState, skeleton: Skeleton): void {
    this.state = state;
    this.skeleton = skeleton;
    this.target = state.view.forces ? 1 : 0;
    this.apply();
  }

  update(deltaSeconds: number): boolean {
    if (this.share === this.target) return false;
    const step = deltaSeconds / EASE_SECONDS;
    const next = this.share + clamp(this.target - this.share, -step, step);
    this.share = next;
    this.apply();
    return true;
  }

  private apply(): void {
    const { state, skeleton } = this;
    this.root.visible = this.share > 0;
    if (!state || !skeleton || !this.root.visible) return;
    const eased = smoothstep(this.share);
    ARMS.forEach((id) => {
      const pose = skeleton.arms[id];
      const length = pushesForward(state, id)
        ? state.reading[id].handForceN * FORCE_SCALE_M_PER_N * eased
        : 0;
      this.place(this.hands[id], pose.hand, FORWARD, length);
      this.middle.addVectors(pose.elbow, pose.wrist).multiplyScalar(0.5);
      this.place(this.forearms[id], this.middle, FORWARD, length * FOREARM_SHARE);
    });
    const dragLength = state.reading.dragN * state.dragFactor * FORCE_SCALE_M_PER_N * eased;
    this.place(this.drag, DRAG_ORIGIN, BACKWARD, dragLength);
  }

  private place(arrow: Arrow, origin: Vector3, direction: Vector3, length: number): void {
    arrow.root.visible = length > 0;
    if (length <= 0) return;
    arrow.root.position.copy(origin);
    arrow.root.quaternion.copy(ALIGN.setFromUnitVectors(UP, direction));
    arrow.shaft.scale.y = Math.max(0, length - HEAD_LENGTH);
    arrow.head.position.y = length;
    arrow.head.scale.setScalar(Math.min(1, length / HEAD_LENGTH));
  }
}

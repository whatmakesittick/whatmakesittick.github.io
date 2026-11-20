import { ConeGeometry, CylinderGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { clamp, smoothstep } from '@core/math';
import type { ArmId, AssemblyState } from '../../ids';
import type { Skeleton } from '../rig/skeleton';
import { FINISHES } from '../finishes';
import type { PartContext } from './context';
import { LAYER } from './pool/constants';

export const FORCE_ARROWS_NAME = 'forceArrows';

const FORCE_SCALE_M_PER_N = 0.005;
const FOREARM_SHARE = 0.45;
const MIN_LENGTH_M = 0.2;
const SHAFT = { tail: 0.01, neck: 0.016 } as const;
const HEAD = { radius: 0.036, length: 0.09 } as const;
const DRAG_SCALE = 1.25;
const SHAFT_SEGMENTS = 16;
const HEAD_SEGMENTS = 24;
const EASE_SECONDS = 0.3;
const ENTRY_CATCH_SHOWN_FROM = 0.6;
const DRAG_TAIL_FROM_NECK = new Vector3(0.26, 0.12, 0.3);
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

interface ArrowParts {
  readonly shaft: BufferGeometry;
  readonly head: BufferGeometry;
}

function pushesForward(state: AssemblyState, arm: ArmId): boolean {
  const { phase, progress } = state.reading[arm];
  if (phase === 'pull' || phase === 'push') return true;
  return phase === 'entryCatch' && progress > ENTRY_CATCH_SHOWN_FROM;
}

function arrowParts(context: PartContext): ArrowParts {
  const shaft = new CylinderGeometry(SHAFT.neck, SHAFT.tail, 1, SHAFT_SEGMENTS).translate(
    0,
    0.5,
    0,
  );
  const head = new ConeGeometry(HEAD.radius, HEAD.length, HEAD_SEGMENTS).translate(
    0,
    -HEAD.length / 2,
    0,
  );
  return { shaft: context.tracker.track(shaft), head: context.tracker.track(head) };
}

function arrowMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = LAYER.arrows;
  return mesh;
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
  private readonly dragTail = new Vector3();

  constructor(context: PartContext) {
    this.root.name = FORCE_ARROWS_NAME;
    const parts = arrowParts(context);
    const thrust = context.materials.get(UNDIMMED_GROUP, FINISHES.thrust);
    const dragMaterial = context.materials.get(UNDIMMED_GROUP, FINISHES.drag);
    const build = (material: Material): Arrow => {
      const arrow = {
        root: new Group(),
        shaft: arrowMesh(parts.shaft, material),
        head: arrowMesh(parts.head, material),
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
    this.share += clamp(this.target - this.share, -step, step);
    this.apply();
    return true;
  }

  private apply(): void {
    const { state, skeleton } = this;
    this.root.visible = this.share > 0;
    if (!state || !skeleton || !this.root.visible) return;
    const grow = smoothstep(this.share);
    ARMS.forEach((id) => {
      const pose = skeleton.arms[id];
      const newtons = pushesForward(state, id) ? state.reading[id].handForceN : 0;
      this.place(this.hands[id], pose.hand, FORWARD, newtons, grow);
      this.middle.addVectors(pose.elbow, pose.wrist).multiplyScalar(0.5);
      this.place(this.forearms[id], this.middle, FORWARD, newtons * FOREARM_SHARE, grow);
    });
    this.dragTail.copy(skeleton.neck).add(DRAG_TAIL_FROM_NECK);
    const dragN = state.reading.dragN * state.dragFactor;
    this.place(this.drag, this.dragTail, BACKWARD, dragN, grow, DRAG_SCALE);
  }

  private place(
    arrow: Arrow,
    origin: Vector3,
    direction: Vector3,
    newtons: number,
    grow: number,
    thickness = 1,
  ): void {
    arrow.root.visible = newtons > 0;
    if (newtons <= 0) return;
    const length = Math.max(newtons * FORCE_SCALE_M_PER_N, MIN_LENGTH_M);
    const headLength = HEAD.length * thickness;
    arrow.root.position.copy(origin);
    arrow.root.quaternion.copy(ALIGN.setFromUnitVectors(UP, direction));
    arrow.root.scale.setScalar(grow);
    arrow.shaft.scale.set(thickness, length - headLength, thickness);
    arrow.head.scale.setScalar(thickness);
    arrow.head.position.y = length;
  }
}

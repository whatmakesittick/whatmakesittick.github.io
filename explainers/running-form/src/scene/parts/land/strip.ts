import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { smoothstep, wrapInto } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { NEAR_STRIP_M } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { fadeNearCamera } from './nearFade';

export interface StripItem {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: Vector3;
  readonly turn: number;
}

export interface StripWindow {
  readonly behindM: number;
  readonly aheadM: number;
  readonly fadeM: number;
  readonly periodM: number;
}

export const NEAR_WINDOW: StripWindow = {
  behindM: 300,
  aheadM: 420,
  fadeM: 60,
  periodM: NEAR_STRIP_M,
};

export function copiesOf(window: StripWindow): number {
  return Math.round((window.behindM + window.aheadM) / window.periodM);
}

export function windowX(stripX: number, scrollM: number, window: StripWindow): number {
  const span = window.behindM + window.aheadM;
  return wrapInto(stripX - scrollM + window.behindM, span) - window.behindM;
}

export function edgeFade(x: number, window: StripWindow): number {
  const inside = Math.min(x + window.behindM, window.aheadM - x);
  return smoothstep(inside / window.fadeM);
}

export type MatrixFor = (entry: StripItem, position: Vector3, fade: number, out: Matrix4) => void;

export interface InstancePart {
  readonly mesh: InstancedMesh;
  readonly local?: Matrix4;
  readonly matrixFor?: MatrixFor;
}

const UP = new Vector3(0, 1, 0);
const item = new Matrix4();
const placed = new Matrix4();
const turn = new Quaternion();
const position = new Vector3();
const size = new Vector3();

export class ScrollingInstances {
  private readonly parts: readonly InstancePart[];
  private readonly items: readonly StripItem[];
  private readonly window: StripWindow;
  private readonly copies: number;
  private lastScroll = Number.NaN;

  constructor(parts: readonly InstancePart[], items: readonly StripItem[], window = NEAR_WINDOW) {
    this.parts = parts;
    this.items = items;
    this.window = window;
    this.copies = copiesOf(window);
    parts.forEach(({ mesh }) => {
      mesh.frustumCulled = false;
    });
  }

  get count(): number {
    return this.items.length * this.copies;
  }

  scroll(scrollM: number): void {
    if (scrollM === this.lastScroll) return;
    this.lastScroll = scrollM;
    this.items.forEach((entry, index) => {
      for (let copy = 0; copy < this.copies; copy += 1) {
        const x = windowX(entry.x + copy * this.window.periodM, scrollM, this.window);
        const fade = edgeFade(x, this.window);
        this.place(index * this.copies + copy, entry, x, fade);
      }
    });
    this.parts.forEach(({ mesh }) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  private place(slot: number, entry: StripItem, x: number, fade: number): void {
    position.set(x, entry.y, entry.z);
    size.copy(entry.scale).multiplyScalar(Math.max(fade, 1e-3));
    turn.setFromAxisAngle(UP, entry.turn);
    item.compose(position, turn, size);
    for (const { mesh, local, matrixFor } of this.parts) {
      if (matrixFor) matrixFor(entry, position, fade, placed);
      else placed.copy(item);
      if (local) placed.multiply(local);
      mesh.setMatrixAt(slot, placed);
    }
  }
}

export function nearMesh(
  context: PartContext,
  geometry: BufferGeometry,
  finish: Finish,
  count: number,
): InstancedMesh {
  const material = fadeNearCamera(context.materials.get(UNDIMMED_GROUP, FINISHES[finish]));
  return new InstancedMesh(context.tracker.track(geometry), material, count);
}

export function scrollingMeshes(
  meshes: readonly InstancedMesh[],
  items: readonly StripItem[],
): ScrollingInstances {
  return new ScrollingInstances(
    meshes.map((mesh) => ({ mesh })),
    items,
  );
}

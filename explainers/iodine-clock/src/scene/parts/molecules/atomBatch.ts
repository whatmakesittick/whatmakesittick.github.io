import { CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { ELEMENT_IDS } from '../../../ids';
import type { ElementId, PartId } from '../../../ids';
import { BOND_RADIUS_A, DRAW_RADIUS_A } from '../../../model';
import { DETAIL } from '../../constants';
import { ATOM_FINISH } from '../../finishes';
import { instanced } from '../context';
import type { PartContext } from '../context';
import type { MoleculeShape } from './shapes';

export type AtomCapacity = Partial<Record<PartId, Partial<Record<ElementId, number>>>>;
export type BondCapacity = Partial<Record<PartId, number>>;

export interface Pose {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly scale: number;
}

interface Slot {
  readonly mesh: InstancedMesh;
  used: number;
}

const UP = new Vector3(0, 1, 0);
const VISIBLE = 0.01;

export class AtomBatch {
  private readonly atoms = new Map<string, Slot>();
  private readonly bonds = new Map<PartId, Slot>();
  private readonly matrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3();
  private readonly middle = new Vector3();
  private readonly span = new Vector3();
  private readonly points: Vector3[] = [];

  constructor(
    context: PartContext,
    parent: Object3D,
    atomCapacity: AtomCapacity,
    bondCapacity: BondCapacity,
  ) {
    const sphere = context.tracker.track(new SphereGeometry(1, ...DETAIL.atom));
    const stick = context.tracker.track(new CylinderGeometry(1, 1, 1, DETAIL.bond, 1, true));
    (Object.keys(atomCapacity) as PartId[]).forEach((part) => {
      ELEMENT_IDS.forEach((element) => {
        const count = atomCapacity[part]?.[element] ?? 0;
        if (count === 0) return;
        const mesh = instanced(context, parent, sphere, part, ATOM_FINISH[element], count);
        mesh.name = `${part}-${element}`;
        this.atoms.set(this.key(part, element), { mesh, used: 0 });
      });
    });
    (Object.keys(bondCapacity) as PartId[]).forEach((part) => {
      const mesh = instanced(context, parent, stick, part, 'bond', bondCapacity[part] ?? 0);
      mesh.name = `${part}-bonds`;
      this.bonds.set(part, { mesh, used: 0 });
    });
  }

  begin(): void {
    this.atoms.forEach((slot) => (slot.used = 0));
    this.bonds.forEach((slot) => (slot.used = 0));
  }

  atom(part: PartId, element: ElementId, at: Vector3, presence = 1): void {
    const slot = this.atoms.get(this.key(part, element));
    if (!slot || presence < VISIBLE || slot.used >= slot.mesh.instanceMatrix.count) return;
    this.scale.setScalar(DRAW_RADIUS_A[element] * presence);
    this.matrix.compose(at, this.rotation.identity(), this.scale);
    slot.mesh.setMatrixAt(slot.used, this.matrix);
    slot.used += 1;
  }

  bond(part: PartId, from: Vector3, to: Vector3, presence = 1): void {
    const slot = this.bonds.get(part);
    if (!slot || presence < VISIBLE || slot.used >= slot.mesh.instanceMatrix.count) return;
    this.span.subVectors(to, from);
    const length = this.span.length();
    if (length === 0) return;
    this.middle.addVectors(from, to).multiplyScalar(1 / 2);
    this.rotation.setFromUnitVectors(UP, this.span.divideScalar(length));
    const radius = BOND_RADIUS_A * presence;
    this.scale.set(radius, length, radius);
    this.matrix.compose(this.middle, this.rotation, this.scale);
    slot.mesh.setMatrixAt(slot.used, this.matrix);
    slot.used += 1;
  }

  molecule(part: PartId, shape: MoleculeShape, pose: Pose, presence = 1): readonly Vector3[] {
    const placed = this.placed(shape.atoms.length);
    shape.atoms.forEach((atom, index) =>
      placed[index]
        .copy(atom.at)
        .multiplyScalar(pose.scale)
        .applyQuaternion(pose.rotation)
        .add(pose.position),
    );
    shape.atoms.forEach((atom, index) =>
      this.atom(part, atom.element, placed[index], presence * pose.scale),
    );
    shape.bonds.forEach(([from, to]) => this.bond(part, placed[from], placed[to], presence));
    return placed;
  }

  end(): void {
    const finish = (slot: Slot) => {
      slot.mesh.count = slot.used;
      slot.mesh.instanceMatrix.needsUpdate = true;
    };
    this.atoms.forEach(finish);
    this.bonds.forEach(finish);
  }

  private placed(count: number): Vector3[] {
    while (this.points.length < count) this.points.push(new Vector3());
    return this.points;
  }

  private key(part: PartId, element: ElementId): string {
    return `${part}:${element}`;
  }
}

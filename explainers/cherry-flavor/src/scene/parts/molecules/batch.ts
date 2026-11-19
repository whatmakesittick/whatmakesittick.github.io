import { CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { ELEMENT_IDS } from '../../../ids';
import type { ElementId, OdorantId } from '../../../ids';
import { ATOM_DRAW_RADIUS, BOND_RADIUS } from '../../../model/scale';
import { DETAIL } from '../../constants';
import { ATOM_FINISH } from '../../finishes';
import { instanced, namedGroup } from '../context';
import type { PartContext } from '../context';
import type { MoleculeShape } from './shapes';

export interface Pose {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  scale: number;
}

interface Stick {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly radius: number;
}

const UP = new Vector3(0, 1, 0);
const FLAT = new Vector3(0, 0, 1);
const VISIBLE = 0.02;
const DOUBLE = { offset: 0.3, trim: 0.18, radius: 0.7 } as const;

function sticksOf(shape: MoleculeShape): Stick[] {
  return shape.bonds.flatMap(({ from, to, double }) => {
    const a = shape.atoms[from].at;
    const b = shape.atoms[to].at;
    const main: Stick = { from: a, to: b, radius: 1 };
    if (!double) return [main];
    const along = b.clone().sub(a);
    const side = new Vector3().crossVectors(along, FLAT).normalize();
    const middle = a.clone().add(b).multiplyScalar(0.5);
    if (side.dot(middle) > 0) side.negate();
    const shift = side.multiplyScalar(DOUBLE.offset);
    return [
      main,
      {
        from: a.clone().addScaledVector(along, DOUBLE.trim).add(shift),
        to: b.clone().addScaledVector(along, -DOUBLE.trim).add(shift),
        radius: DOUBLE.radius,
      },
    ];
  });
}

export class OdorantBatch {
  readonly group: Object3D;
  private readonly shape: MoleculeShape;
  private readonly sticks: Stick[];
  private readonly atoms = new Map<ElementId, InstancedMesh>();
  private readonly bonds: InstancedMesh;
  private readonly used = new Map<InstancedMesh, number>();
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly size = new Vector3();
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly middle = new Vector3();

  constructor(
    context: PartContext,
    parent: Object3D,
    id: OdorantId,
    shape: MoleculeShape,
    copies: number,
  ) {
    this.group = namedGroup(id, parent);
    this.shape = shape;
    this.sticks = sticksOf(shape);
    const sphere = context.tracker.track(new SphereGeometry(1, ...DETAIL.atom));
    const stick = context.tracker.track(new CylinderGeometry(1, 1, 1, DETAIL.bond, 1, true));
    ELEMENT_IDS.forEach((element) => {
      const count = shape.atoms.filter((atom) => atom.element === element).length * copies;
      if (count === 0) return;
      this.atoms.set(
        element,
        instanced(context, this.group, sphere, id, ATOM_FINISH[element], count),
      );
    });
    this.bonds = instanced(context, this.group, stick, id, 'bond', this.sticks.length * copies);
  }

  begin(): void {
    this.atoms.forEach((mesh) => this.used.set(mesh, 0));
    this.used.set(this.bonds, 0);
  }

  draw(pose: Pose): void {
    if (pose.scale < VISIBLE) return;
    this.shape.atoms.forEach((atom) => {
      const mesh = this.atoms.get(atom.element);
      if (!mesh) return;
      this.place(atom.at, pose, this.a);
      this.size.setScalar(ATOM_DRAW_RADIUS[atom.element] * pose.scale);
      this.matrix.compose(this.a, this.turn.identity(), this.size);
      this.push(mesh);
    });
    this.sticks.forEach((stick) => {
      this.place(stick.from, pose, this.a);
      this.place(stick.to, pose, this.b);
      const length = this.a.distanceTo(this.b);
      this.middle.addVectors(this.a, this.b).multiplyScalar(0.5);
      this.turn.setFromUnitVectors(UP, this.b.sub(this.a).divideScalar(length));
      const radius = BOND_RADIUS * stick.radius * pose.scale;
      this.size.set(radius, length, radius);
      this.matrix.compose(this.middle, this.turn, this.size);
      this.push(this.bonds);
    });
  }

  end(): number {
    let drawn = 0;
    this.used.forEach((count, mesh) => {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      drawn += count;
    });
    this.group.visible = drawn > 0;
    return drawn;
  }

  private place(local: Vector3, pose: Pose, out: Vector3): Vector3 {
    return out
      .copy(local)
      .multiplyScalar(pose.scale)
      .applyQuaternion(pose.rotation)
      .add(pose.position);
  }

  private push(mesh: InstancedMesh): void {
    const index = this.used.get(mesh) ?? 0;
    if (index >= mesh.instanceMatrix.count) return;
    mesh.setMatrixAt(index, this.matrix);
    this.used.set(mesh, index + 1);
  }
}

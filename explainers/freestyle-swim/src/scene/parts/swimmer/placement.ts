import { Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';

const MIN_HINT_SQUARED = 0.04;

const along = new Vector3();
const across = new Vector3();
const normal = new Vector3();
const basis = new Matrix4();
const span = new Vector3();

export class Placer {
  private readonly remembered = new WeakMap<Object3D, Vector3>();

  between(object: Object3D, from: Vector3, to: Vector3, hint: Vector3): void {
    this.place(object, from, span.subVectors(to, from), hint);
  }

  place(object: Object3D, origin: Vector3, axis: Vector3, hint: Vector3): void {
    along.copy(axis).normalize();
    normal.copy(hint).addScaledVector(along, -hint.dot(along));
    const kept = this.remembered.get(object) ?? new Vector3().copy(hint);
    if (normal.lengthSq() < MIN_HINT_SQUARED) {
      normal.copy(kept).addScaledVector(along, -kept.dot(along));
    }
    normal.normalize();
    kept.copy(normal);
    this.remembered.set(object, kept);
    across.crossVectors(along, normal).normalize();
    object.position.copy(origin);
    object.quaternion.setFromRotationMatrix(basis.makeBasis(across, along, normal));
  }
}

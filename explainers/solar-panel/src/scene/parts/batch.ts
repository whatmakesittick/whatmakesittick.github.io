import { Group } from 'three';
import type { BufferGeometry } from 'three';
import type { Finish } from '../finishes';
import { mergeParts } from '../geometry/merge';
import { partMesh } from './context';
import type { EmphasisGroup, PartContext } from './context';

export class FinishBatch {
  private readonly pieces = new Map<Finish, BufferGeometry[]>();

  add(finish: Finish, ...geometries: BufferGeometry[]): this {
    const list = this.pieces.get(finish) ?? [];
    list.push(...geometries);
    this.pieces.set(finish, list);
    return this;
  }

  take(finish: Finish): BufferGeometry[] {
    const pieces = this.pieces.get(finish) ?? [];
    this.pieces.delete(finish);
    return pieces;
  }

  build(context: PartContext, group: EmphasisGroup): Group {
    const object = new Group();
    this.pieces.forEach((geometries, finish) => {
      object.add(partMesh(context, mergeParts(geometries), group, finish));
    });
    this.pieces.clear();
    return object;
  }
}

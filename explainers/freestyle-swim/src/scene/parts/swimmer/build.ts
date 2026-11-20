import { Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';

export class PartBuilder {
  readonly labels = new Map<PartId, Object3D>();
  private readonly context: PartContext;

  constructor(context: PartContext) {
    this.context = context;
  }

  track<T extends { dispose(): void }>(item: T): T {
    return this.context.tracker.track(item);
  }

  material(group: string, finish: Finish): Material {
    return this.context.materials.get(group, FINISHES[finish]);
  }

  mesh(geometry: BufferGeometry, group: string, finish: Finish, parent: Object3D): Mesh {
    const mesh = new Mesh(this.track(geometry), this.material(group, finish));
    parent.add(mesh);
    return mesh;
  }

  label(id: PartId, parent: Object3D, at: readonly number[]): Object3D {
    const anchor = anchorAt(parent, at[0], at[1], at[2]);
    this.labels.set(id, anchor);
    return anchor;
  }
}

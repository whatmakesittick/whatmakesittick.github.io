import { Matrix4 } from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { partInstances } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

export type KeyedMatrix = readonly [key: number, matrix: Matrix4];

interface Row {
  mesh: InstancedMesh;
  keys: readonly number[];
  matrices: readonly Matrix4[];
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export interface InstanceSpec {
  geometry: BufferGeometry;
  group: EmphasisGroup;
  finish: MaterialFinish;
  entries: readonly KeyedMatrix[];
}

export class KeyedInstances {
  private readonly context: PartContext;
  private readonly parent: Object3D;
  private readonly rows: Row[] = [];
  private hidden: number | null = null;

  constructor(context: PartContext, parent: Object3D) {
    this.context = context;
    this.parent = parent;
  }

  get meshes(): readonly InstancedMesh[] {
    return this.rows.map((row) => row.mesh);
  }

  add({ geometry, group, finish, entries }: InstanceSpec): InstancedMesh {
    const mesh = partInstances(this.context, geometry, group, finish, entries.length);
    entries.forEach(([, matrix], index) => mesh.setMatrixAt(index, matrix));
    mesh.computeBoundingSphere();
    this.parent.add(mesh);
    this.rows.push({
      mesh,
      keys: entries.map(([key]) => key),
      matrices: entries.map(([, m]) => m),
    });
    if (this.hidden !== null) this.setKey(this.rows[this.rows.length - 1], this.hidden, true);
    return mesh;
  }

  hide(key: number): void {
    if (key === this.hidden) return;
    const previous = this.hidden;
    this.hidden = key;
    this.rows.forEach((row) => {
      if (previous !== null) this.setKey(row, previous, false);
      this.setKey(row, key, true);
    });
  }

  private setKey(row: Row, key: number, hidden: boolean): void {
    row.keys.forEach((rowKey, index) => {
      if (rowKey === key) row.mesh.setMatrixAt(index, hidden ? HIDDEN : row.matrices[index]);
    });
    row.mesh.instanceMatrix.needsUpdate = true;
  }
}

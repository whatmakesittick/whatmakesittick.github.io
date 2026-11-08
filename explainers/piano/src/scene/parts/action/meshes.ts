import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Matrix4, Mesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { DetailedPose } from './layout';
import { namedGroup, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const ROD_SEGMENTS = 8;

export interface Pivot {
  pivot: Group;
  body: Group;
}

export interface Piece {
  setKey?(key: number): void;
  pose?(pose: DetailedPose): void;
  focus?(close: boolean): void;
}

export function pivotFrame(parent: Object3D, name: string, y: number, z: number): Pivot {
  const pivot = namedGroup(name, parent);
  pivot.position.set(0, y, z);
  const body = new Group();
  body.position.set(0, -y, -z);
  pivot.add(body);
  return { pivot, body };
}

export function addMesh(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  const mesh = partMesh(context, geometry, group, finish);
  parent.add(mesh);
  return mesh;
}

export function rodGeometry(segments = ROD_SEGMENTS): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segments);
}

export function uprightRod(
  [x, z]: readonly [number, number],
  [bottom, top]: readonly [number, number],
  radius: number,
  segments = ROD_SEGMENTS,
): BufferGeometry {
  return new CylinderGeometry(radius, radius, top - bottom, segments).translate(
    x,
    (bottom + top) / 2,
    z,
  );
}

export function placeRod(
  mesh: Object3D,
  [x, z]: readonly [number, number],
  [bottom, top]: readonly [number, number],
  radius: number,
): void {
  mesh.position.set(x, (bottom + top) / 2, z);
  mesh.scale.set(radius, top - bottom, radius);
}

export function applyMatrix(object: Object3D, matrix: Matrix4): void {
  matrix.decompose(object.position, object.quaternion, object.scale);
}

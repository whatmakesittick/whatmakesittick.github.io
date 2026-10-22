import { Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Color } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { LINE_GROUP } from '../../context';
import type { PartContext } from '../../context';

export interface Instance {
  readonly position: readonly [number, number, number];
  readonly turn: number;
  readonly scale: readonly [number, number, number];
  readonly colour: Color;
}

const matrix = new Matrix4();
const rotation = new Quaternion();
const euler = new Euler();
const position = new Vector3();
const scale = new Vector3();

export function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  finish: MaterialFinish,
  instances: readonly Instance[],
  name: string,
): InstancedMesh {
  const material = context.materials.get(LINE_GROUP, finish);
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, Math.max(1, instances.length)),
  );
  mesh.name = name;
  mesh.count = instances.length;
  instances.forEach((instance, index) => {
    rotation.setFromEuler(euler.set(0, instance.turn, 0));
    matrix.compose(position.set(...instance.position), rotation, scale.set(...instance.scale));
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, instance.colour);
  });
  mesh.computeBoundingSphere();
  return mesh;
}

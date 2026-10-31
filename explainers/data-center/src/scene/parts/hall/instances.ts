import { InstancedMesh } from 'three';
import type { BufferGeometry, Material, Matrix4, Color } from 'three';
import { boundInstances } from '../context';
import type { PartContext } from '../context';

export function instances(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material | Material[],
  matrices: readonly Matrix4[],
  colours?: readonly Color[],
): InstancedMesh {
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, Math.max(1, matrices.length)),
  );
  mesh.count = matrices.length;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  colours?.forEach((colour, index) => mesh.setColorAt(index, colour));
  return boundInstances(mesh);
}

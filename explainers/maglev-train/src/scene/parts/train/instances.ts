import { InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { EmphasisGroup, PartContext } from '../context';
import { isAhead } from './layout';

export interface CutInstances {
  readonly mesh: InstancedMesh;
  readonly behind: number;
  readonly total: number;
}

export function cutInstances(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  slots: readonly number[],
): CutInstances {
  const sorted = [...slots].sort((a, b) => a - b);
  const material = context.materials.get(group, finish);
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, sorted.length),
  );
  const matrix = new Matrix4();
  sorted.forEach((x, index) => mesh.setMatrixAt(index, matrix.makeTranslation(x, 0, 0)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = group;
  return { mesh, behind: sorted.filter((x) => !isAhead(x)).length, total: sorted.length };
}

export function showAhead(instances: CutInstances, shown: boolean): void {
  instances.mesh.count = shown ? instances.total : instances.behind;
}

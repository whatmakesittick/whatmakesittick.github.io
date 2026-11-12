import { InstancedMesh } from 'three';
import type { BufferGeometry, Matrix4 } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../../../ids';
import type { PartContext } from '../context';

export function finishInstances(
  context: PartContext,
  geometry: BufferGeometry,
  group: PartId,
  finish: MaterialFinish,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const target = context.tracker.track(
    new InstancedMesh(
      context.tracker.track(geometry),
      context.materials.get(group, finish),
      Math.max(1, matrices.length),
    ),
  );
  matrices.forEach((matrix, index) => target.setMatrixAt(index, matrix));
  target.instanceMatrix.needsUpdate = true;
  target.frustumCulled = false;
  return target;
}

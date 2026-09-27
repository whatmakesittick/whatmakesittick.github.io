import type { Mesh } from 'three';
import { RENDER_ORDER } from '../constants';
import { biconvexLens } from '../geometry/lens';
import { partMesh } from './context';
import type { EmphasisGroup, PartContext } from './context';

export interface LensSize {
  radius: number;
  thickness: number;
}

export function glassLens(
  context: PartContext,
  group: EmphasisGroup,
  size: LensSize,
  height = 0,
): Mesh {
  const lens = partMesh(context, biconvexLens(size.radius, size.thickness), group, 'glass');
  lens.position.y = height;
  lens.renderOrder = RENDER_ORDER.glass;
  return lens;
}

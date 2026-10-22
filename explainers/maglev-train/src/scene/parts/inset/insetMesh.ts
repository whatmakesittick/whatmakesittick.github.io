import type { BufferGeometry, Mesh, MeshBasicMaterial } from 'three';
import type { PartContext } from '../context';
import { INSET_GROUP, LAYER, LAYER_DEPTH } from './constants';
import { flatMesh } from './flat';
import type { FlatLook } from './flat';

export function insetMesh(
  context: PartContext,
  geometry: BufferGeometry,
  look: FlatLook,
  layer: number,
): Mesh<BufferGeometry, MeshBasicMaterial> {
  const mesh = flatMesh(context, geometry, INSET_GROUP, { depthTest: false, ...look }, layer);
  mesh.position.z = (layer - LAYER.ground) * LAYER_DEPTH;
  return mesh;
}

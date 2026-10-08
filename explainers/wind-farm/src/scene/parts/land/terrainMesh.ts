import type { BufferGeometry, Mesh, Texture } from 'three';
import type { PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { LAND_RENDER_ORDER } from './constants';

export function terrainMesh(
  context: PartContext,
  geometry: BufferGeometry,
  map: Texture,
  part: PartId,
): Mesh {
  const mesh = finishMesh(context, geometry, part, { ...FINISHES.grass, transparent: true, map });
  mesh.name = part;
  mesh.renderOrder = LAND_RENDER_ORDER;
  mesh.receiveShadow = true;
  return mesh;
}

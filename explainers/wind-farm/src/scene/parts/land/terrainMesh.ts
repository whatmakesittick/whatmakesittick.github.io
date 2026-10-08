import type { BufferGeometry, Mesh } from 'three';
import type { PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { LAND_RENDER_ORDER } from './constants';

const FADING_GRASS = { ...FINISHES.grass, transparent: true };

export function terrainMesh(context: PartContext, geometry: BufferGeometry, part: PartId): Mesh {
  const mesh = finishMesh(context, geometry, part, FADING_GRASS);
  mesh.name = part;
  mesh.renderOrder = LAND_RENDER_ORDER;
  mesh.receiveShadow = true;
  return mesh;
}

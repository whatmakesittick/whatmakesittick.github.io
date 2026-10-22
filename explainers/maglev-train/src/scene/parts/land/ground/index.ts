import { Mesh } from 'three';
import type { PartContext } from '../../context';
import { LINE_GROUP } from '../../context';
import { GROUND } from '../constants';
import { landBlocks } from './blocks';
import { tileFields } from './fields';
import { LINEARS } from './linears';
import { groundGeometry } from './mesh';
import { groundMaps } from './texture';
import type { GroundPlan } from './texture';
import { centredWarp } from './warp';

const GROUND_RENDER_ORDER = -10;

export function groundPlan(): GroundPlan {
  return {
    fields: tileFields(landBlocks(LINEARS)),
    linears: LINEARS,
    warp: centredWarp(GROUND.reach, GROUND.texture.softness),
  };
}

export function groundMesh(context: PartContext, plan: GroundPlan): Mesh {
  const maps = groundMaps(context, plan);
  const material = context.materials.get(LINE_GROUP, {
    color: '#ffffff',
    map: maps.colour,
    roughnessMap: maps.roughness,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new Mesh(context.tracker.track(groundGeometry(plan.warp)), material);
  mesh.name = 'ground';
  mesh.renderOrder = GROUND_RENDER_ORDER;
  return mesh;
}

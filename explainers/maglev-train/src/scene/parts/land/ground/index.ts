import { Mesh, MeshStandardMaterial } from 'three';
import type { PartContext } from '../../context';
import { LINE_GROUP, registeredMaterial } from '../../context';
import type { CutUniform } from '../../line/cut';
import { shadeBehindCut } from '../casterCut';
import { GROUND } from '../constants';
import { landBlocks } from './blocks';
import { tileFields } from './fields';
import { LINEARS } from './linears';
import { groundGeometry } from './mesh';
import { groundMaps } from './texture';
import type { GroundPlan } from './texture';
import { centredWarp } from './warp';

const GROUND_RENDER_ORDER = -10;
const GROUND_REFLECTION = 0.4;
const GROUND_PROGRAM = 'maglevGroundShade';

export function groundPlan(): GroundPlan {
  return {
    fields: tileFields(landBlocks(LINEARS)),
    linears: LINEARS,
    warp: centredWarp(GROUND.reach, GROUND.texture.softness),
  };
}

export function groundMesh(context: PartContext, plan: GroundPlan, cut: CutUniform): Mesh {
  const maps = groundMaps(context, plan);
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    map: maps.colour,
    roughnessMap: maps.roughness,
    roughness: 1,
    metalness: 0,
    envMapIntensity: GROUND_REFLECTION,
  });
  material.onBeforeCompile = (shader) => shadeBehindCut(shader, maps.shade, cut);
  material.customProgramCacheKey = () => GROUND_PROGRAM;
  registeredMaterial(context, LINE_GROUP, material);
  const mesh = new Mesh(context.tracker.track(groundGeometry(plan.warp)), material);
  mesh.name = 'ground';
  mesh.renderOrder = GROUND_RENDER_ORDER;
  return mesh;
}

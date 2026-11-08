import { InstancedMesh } from 'three';
import type { BufferGeometry, Material, MeshStandardMaterialParameters } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { patchShader } from './patches';
import type { ShaderPatch } from './patches';

export interface PatchedSpec {
  readonly group: EmphasisGroup;
  readonly finish: MaterialFinish;
  readonly patch: ShaderPatch;
  readonly extra?: MeshStandardMaterialParameters;
  readonly cut?: boolean;
}

export function patchedMaterial(context: PartContext, spec: PatchedSpec): Material {
  const material = patchShader(createMaterial({ ...spec.finish, ...spec.extra }), spec.patch);
  return registeredMaterial(context, spec.group, material, spec.cut ?? true);
}

export function instances(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
  count: number,
): InstancedMesh {
  return context.tracker.track(new InstancedMesh(context.tracker.track(geometry), material, count));
}

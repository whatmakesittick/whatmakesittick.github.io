import { Mesh, Vector3 } from 'three';
import type { BufferGeometry, MeshStandardMaterial, Raycaster } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { EmphasisGroup, PartContext } from '../context';
import { registered } from '../context';

export interface WallSide {
  readonly normal: readonly [number, number, number];
  readonly offset: number;
}

const DECLARATIONS = 'uniform vec3 farSideNormal;\nuniform float farSideOffset;\nvoid main() {';
const DISCARD = '\n  if ( dot( cameraPosition, farSideNormal ) > farSideOffset ) discard;';
const CACHE_KEY = 'mriFarSide';

export function isBeyond(point: Vector3, side: WallSide): boolean {
  return point.dot(new Vector3(...side.normal)) > side.offset;
}

export function farSideMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
  side: WallSide,
): MeshStandardMaterial {
  const material = createMaterial(finish);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.farSideNormal = { value: new Vector3(...side.normal) };
    shader.uniforms.farSideOffset = { value: side.offset };
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', DECLARATIONS + DISCARD);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return registered(context, group, material);
}

export function farSideMesh(
  context: PartContext,
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  side: WallSide,
): Mesh {
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.raycast = (raycaster: Raycaster, hits) => {
    if (isBeyond(raycaster.ray.origin, side)) return;
    Mesh.prototype.raycast.call(mesh, raycaster, hits);
  };
  return mesh;
}

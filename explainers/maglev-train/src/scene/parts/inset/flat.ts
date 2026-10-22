import { DoubleSide, FrontSide, MeshBasicMaterial } from 'three';
import type { BufferGeometry, Mesh, Texture } from 'three';
import { registeredMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

export interface FlatLook {
  readonly colour: string;
  readonly opacity?: number;
  readonly map?: Texture;
  readonly depthTest?: boolean;
  readonly doubleSided?: boolean;
}

export function flatMaterial(look: FlatLook): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: look.colour,
    map: look.map ?? null,
    transparent: true,
    opacity: look.opacity ?? 1,
    depthWrite: false,
    depthTest: look.depthTest ?? true,
    side: look.doubleSided ? DoubleSide : FrontSide,
    fog: false,
    toneMapped: false,
  });
}

export function flatMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  look: FlatLook,
  order: number,
): Mesh {
  const mesh = registeredMesh(context, geometry, group, flatMaterial(look));
  mesh.renderOrder = order;
  return mesh;
}

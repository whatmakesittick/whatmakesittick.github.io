import { PlaneGeometry } from 'three';
import type { BufferGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import type { PartContext } from '../context';
import { INSET_GROUP, LAYER, LAYER_DEPTH } from './constants';
import { flatMesh } from './flat';
import type { FlatLook } from './flat';
import { CONTENT, FIELD_WAVELENGTH_DRAWN } from './layout';

type FlatMesh = Mesh<BufferGeometry, MeshBasicMaterial>;

export interface InsetPart<Args extends unknown[]> {
  readonly group: Group;
  draw(...args: Args): void;
}

const WHITE = '#ffffff';

export function layerDepth(layer: number): number {
  return (layer - LAYER.ground) * LAYER_DEPTH;
}

export function insetMesh(
  context: PartContext,
  geometry: BufferGeometry,
  look: FlatLook,
  layer: number,
): FlatMesh {
  const mesh = flatMesh(context, geometry, INSET_GROUP, { depthTest: false, ...look }, layer);
  mesh.position.z = layerDepth(layer);
  return mesh;
}

export function contentStrip(height: number, centreY: number): BufferGeometry {
  return new PlaneGeometry(CONTENT.width, height).translate(0, centreY, 0);
}

export function patternStrip(
  context: PartContext,
  map: Texture,
  [top, bottom]: readonly [number, number],
  layer: number,
  opacity?: number,
): FlatMesh {
  map.repeat.x = CONTENT.width / FIELD_WAVELENGTH_DRAWN;
  const geometry = contentStrip(top - bottom, (top + bottom) / 2);
  return insetMesh(context, geometry, { colour: WHITE, map, opacity }, layer);
}

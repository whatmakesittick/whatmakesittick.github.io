import { MeshBasicMaterial, PlaneGeometry } from 'three';
import type { MeshBasicMaterialParameters } from 'three';
import { LINE_GROUP, registeredMaterial } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const DECAL_OFFSET = -4;

export const DECAL_LAYER = {
  polygonOffset: true,
  polygonOffsetFactor: DECAL_OFFSET,
  polygonOffsetUnits: DECAL_OFFSET,
} as const;

export function groundQuad(): PlaneGeometry {
  return new PlaneGeometry(1, 1).rotateX(-QUARTER_TURN);
}

export function overlayMaterial(
  context: PartContext,
  look: MeshBasicMaterialParameters,
): MeshBasicMaterial {
  return registeredMaterial(
    context,
    LINE_GROUP,
    new MeshBasicMaterial({ transparent: true, depthWrite: false, ...look }),
  );
}

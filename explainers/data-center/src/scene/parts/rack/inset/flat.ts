import { DoubleSide, FrontSide, Mesh, MeshBasicMaterial } from 'three';
import type { BufferGeometry } from 'three';
import { INSET } from '../../../../model';
import { registeredMaterial } from '../../context';
import type { PartContext } from '../../context';

export const INSET_PART = 'chipInset';

export const LAYER = { back: 1, fill: 2, inner: 3, line: 4, halo: 5, core: 6 } as const;

const FACE_Z = INSET.depth / 2;
const LIFT_M = 0.002;
const LAYER_STEP_M = 0.001;
const OFFSET_FACTOR = -1;
const OFFSET_UNITS = -4;

export interface Ink {
  readonly colour: string;
  readonly opacity?: number;
  readonly doubleSided?: boolean;
}

export function flatMaterial(ink: Ink): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: ink.colour,
    transparent: true,
    opacity: ink.opacity ?? 1,
    depthWrite: false,
    side: ink.doubleSided ? DoubleSide : FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: OFFSET_FACTOR,
    polygonOffsetUnits: OFFSET_UNITS,
    fog: false,
    toneMapped: false,
  });
}

export function inkedMesh(context: PartContext, geometry: BufferGeometry, ink: Ink): Mesh {
  const material = registeredMaterial(context, INSET_PART, flatMaterial(ink));
  return new Mesh(context.tracker.track(geometry), material);
}

export function flatMesh(
  context: PartContext,
  geometry: BufferGeometry,
  ink: Ink,
  layer: number,
): Mesh {
  const mesh = inkedMesh(context, geometry, ink);
  mesh.renderOrder = layer;
  mesh.position.z = FACE_Z + LIFT_M + layer * LAYER_STEP_M;
  return mesh;
}

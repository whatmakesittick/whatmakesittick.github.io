import { Box3, Vector3 } from 'three';
import type { EngineSpec } from '../model';
import { CRANKCASE, FLOOR_GAP, FLYWHEEL, HEAD, SCENE_UNITS_PER_MM } from './constants';
import type { EngineDimensions } from './dimensions';
import type { LayoutGeometry } from './layout';

export type RegionId = 'all' | 'head' | 'chamber' | 'crank' | 'column';

const CHAMBER_REGION = { halfWidthPerBore: 0.8, strokeBelow: 0.55, above: 95 } as const;

function toWorld(min: Vector3, max: Vector3): Box3 {
  return new Box3(min.multiplyScalar(SCENE_UNITS_PER_MM), max.multiplyScalar(SCENE_UNITS_PER_MM));
}

export function chamberRegion(
  spec: EngineSpec,
  dims: EngineDimensions,
  layout: LayoutGeometry,
): Box3 {
  const face = dims.headFaceHeight;
  const halfWidth = spec.bore * CHAMBER_REGION.halfWidthPerBore;
  const z = layout.primaryCylinder.z;
  const bottom = face - spec.strokeLength * CHAMBER_REGION.strokeBelow;
  return toWorld(
    new Vector3(-halfWidth, bottom, z - dims.boreRadius),
    new Vector3(halfWidth, face + CHAMBER_REGION.above, z + dims.boreRadius),
  );
}

export function columnRegion(dims: EngineDimensions, layout: LayoutGeometry): Box3 {
  const { halfLength, cutNormal } = layout;
  const front = cutNormal.z > 0 ? dims.boreRadius : halfLength;
  return toWorld(
    new Vector3(-HEAD.halfWidth, CRANKCASE.bottom, -halfLength),
    new Vector3(HEAD.halfWidth, dims.headFaceHeight + HEAD.coverTop, front),
  );
}

export function floorHeight(): number {
  return (Math.min(CRANKCASE.bottom, -FLYWHEEL.radius) - FLOOR_GAP) * SCENE_UNITS_PER_MM;
}

import type { BufferGeometry, Shape } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Box, Extent } from '../../model/scale';
import { splitAtCut } from './cut';
import { keptSectionShape, wholeSectionShape } from './section';
import type { Section } from './section';
import { extrudeAlongX, extrudeSide } from './side';
import { KEPT_HALF, turnOutline, turnStrands, turnedCap } from './turned';
import type { TurnPoint, TurnStrand } from './turned';

export type CutPiece =
  | { kind: 'always'; geometry: BufferGeometry }
  | { kind: 'removed'; geometry: BufferGeometry }
  | { kind: 'split'; whole: BufferGeometry; half: BufferGeometry; face: BufferGeometry | null };

export type SplitPiece = Extract<CutPiece, { kind: 'split' }>;

const ON_CUT = 1e-4;
const CREASE_ANGLE = toRadians(40);

function creased(geometry: BufferGeometry): BufferGeometry {
  const result = toCreasedNormals(geometry, CREASE_ANGLE);
  if (result !== geometry) geometry.dispose();
  return result;
}

export function piece(geometry: BufferGeometry): CutPiece {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.max.z <= ON_CUT) return { kind: 'always', geometry };
  if (bounds.min.z >= -ON_CUT) return { kind: 'removed', geometry };
  return { kind: 'split', whole: geometry, ...splitAtCut(geometry) };
}

export function solid(geometry: BufferGeometry): CutPiece {
  return { kind: 'always', geometry };
}

export function boxGeometry({ x, y, z }: Box): BufferGeometry {
  return box({ minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: z[0], maxZ: z[1] });
}

const ROUNDING_SEGMENTS = 2;

export function roundedBox({ x, y, z }: Box, radius: number): BufferGeometry {
  const size = (extent: Extent) => extent[1] - extent[0];
  const middle = (extent: Extent) => (extent[0] + extent[1]) / 2;
  const fit = Math.min(radius, size(x) / 2, size(y) / 2, size(z) / 2);
  return new RoundedBoxGeometry(size(x), size(y), size(z), ROUNDING_SEGMENTS, fit).translate(
    middle(x),
    middle(y),
    middle(z),
  );
}

export function boxPiece(bounds: Box, radius = 0): CutPiece {
  return piece(radius > 0 ? roundedBox(bounds, radius) : boxGeometry(bounds));
}

export function sidePiece(shape: Shape, z: Extent, bevel = 0): CutPiece {
  return piece(creased(extrudeSide(shape, z, bevel)));
}

export function solidSide(shape: Shape, z: Extent, bevel = 0): CutPiece {
  return solid(creased(extrudeSide(shape, z, bevel)));
}

export function sectionPiece(section: Section, x: Extent, bevel = 0): SplitPiece {
  const whole = creased(extrudeAlongX(wholeSectionShape(section), x, bevel));
  const kept = creased(extrudeAlongX(keptSectionShape(section), x, bevel));
  const split = splitAtCut(kept);
  kept.dispose();
  return { kind: 'split', whole, ...split };
}

export interface TurnedSpec {
  strands: readonly TurnStrand[];
  segments: number;
  axisY?: number;
  cap?: readonly TurnPoint[] | null;
}

export function turnedPiece(spec: TurnedSpec): SplitPiece {
  const { strands, segments, axisY = 0 } = spec;
  const cap = spec.cap === undefined ? turnOutline(strands) : spec.cap;
  return {
    kind: 'split',
    whole: turnStrands(strands, segments).translate(0, axisY, 0),
    half: turnStrands(strands, segments, KEPT_HALF).translate(0, axisY, 0),
    face: cap && cap.length > 2 ? turnedCap(cap).translate(0, axisY, 0) : null,
  };
}

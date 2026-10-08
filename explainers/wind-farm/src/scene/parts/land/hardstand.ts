import { CircleGeometry, ShapeGeometry } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { FINISHES } from '../../finishes';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { HARDSTAND } from './constants';

const FLAT_TURN = -Math.PI / 2;
const POLYGON_OFFSET = { factor: -1, units: -4 } as const;

const HARDSTAND_FINISH = {
  ...FINISHES.gravel,
  polygonOffset: true,
  polygonOffsetFactor: POLYGON_OFFSET.factor,
  polygonOffsetUnits: POLYGON_OFFSET.units,
};

function hardstandGeometry(): BufferGeometry {
  const { pad, apronRadius, corner, arcSegments, lift } = HARDSTAND;
  const padShape = roundedRectShape(
    { minA: pad.minX, maxA: pad.maxX, minB: -pad.maxZ, maxB: -pad.minZ },
    corner,
  );
  const parts = [
    new ShapeGeometry(padShape, arcSegments),
    new CircleGeometry(apronRadius, arcSegments),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  merged.rotateX(FLAT_TURN);
  merged.translate(0, lift, 0);
  return merged;
}

export function hardstandMesh(context: PartContext): Mesh {
  const mesh = finishMesh(context, hardstandGeometry(), 'land', HARDSTAND_FINISH);
  mesh.name = 'land';
  mesh.receiveShadow = true;
  return mesh;
}

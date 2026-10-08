import { CylinderGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { TURBINE_GEOMETRY } from '../../../model/layout';
import { mergeParts } from '../../geometry/merge';
import { groupMesh, label, partMesh } from '../context';
import type { PartContext } from '../context';

const [CENTRE_X, , CENTRE_Z] = TURBINE_GEOMETRY.transformer.centre;
const [WIDTH, HEIGHT, DEPTH] = TURBINE_GEOMETRY.transformer.size;
const PAD = { margin: 0.6, top: 0.15, bottom: -0.3 } as const;
const LID = { thickness: 0.14, overhang: 0.06 } as const;
const FINS = {
  count: 9,
  depth: 0.42,
  thickness: 0.05,
  bottom: 0.45,
  top: 2.0,
  inset: 0.3,
} as const;
const BUSHING = { radius: 0.09, height: 0.55, spacing: 0.7, segments: 10, inset: 0.6 } as const;

function padGeometry(): BufferGeometry {
  return box({
    minX: CENTRE_X - WIDTH / 2 - PAD.margin,
    maxX: CENTRE_X + WIDTH / 2 + PAD.margin,
    minY: PAD.bottom,
    maxY: PAD.top,
    minZ: CENTRE_Z - DEPTH / 2 - PAD.margin,
    maxZ: CENTRE_Z + DEPTH / 2 + PAD.margin,
  });
}

function finGeometries(): BufferGeometry[] {
  const span = DEPTH - FINS.inset * 2;
  return [-1, 1].flatMap((side) =>
    Array.from({ length: FINS.count }, (_, index) => {
      const z = CENTRE_Z - span / 2 + (span * index) / (FINS.count - 1);
      const wall = CENTRE_X + (side * WIDTH) / 2;
      const outer = wall + side * FINS.depth;
      return box({
        minX: Math.min(wall, outer) - FINS.thickness,
        maxX: Math.max(wall, outer) + FINS.thickness,
        minY: FINS.bottom,
        maxY: FINS.top,
        minZ: z - FINS.thickness / 2,
        maxZ: z + FINS.thickness / 2,
      });
    }),
  );
}

function bushingGeometries(): BufferGeometry[] {
  return [-1, 0, 1].map((step) => {
    const bushing = new CylinderGeometry(
      BUSHING.radius * 0.7,
      BUSHING.radius,
      BUSHING.height,
      BUSHING.segments,
    );
    bushing.translate(
      CENTRE_X + step * BUSHING.spacing,
      HEIGHT + BUSHING.height / 2,
      CENTRE_Z - DEPTH / 2 + BUSHING.inset,
    );
    return bushing;
  });
}

function bodyGeometry(): BufferGeometry {
  const body = box({
    minX: CENTRE_X - WIDTH / 2,
    maxX: CENTRE_X + WIDTH / 2,
    minY: PAD.top - LID.thickness,
    maxY: HEIGHT - LID.thickness,
    minZ: CENTRE_Z - DEPTH / 2,
    maxZ: CENTRE_Z + DEPTH / 2,
  });
  const lid = box({
    minX: CENTRE_X - WIDTH / 2 - LID.overhang,
    maxX: CENTRE_X + WIDTH / 2 + LID.overhang,
    minY: HEIGHT - LID.thickness,
    maxY: HEIGHT,
    minZ: CENTRE_Z - DEPTH / 2 - LID.overhang,
    maxZ: CENTRE_Z + DEPTH / 2 + LID.overhang,
  });
  return mergeParts([body, lid, ...finGeometries(), ...bushingGeometries()]);
}

export function buildTransformer(context: PartContext, parent: Object3D): void {
  const transformer = partMesh(context, bodyGeometry(), 'transformer');
  transformer.add(groupMesh(context, padGeometry(), 'transformer', 'concrete'));
  parent.add(transformer);
  label(context, 'transformer', transformer, [CENTRE_X, HEIGHT, CENTRE_Z]);
}

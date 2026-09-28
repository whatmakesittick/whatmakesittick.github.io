import { Group } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, planShape, roundedRectShape } from '@core/scene/geometry/extrude';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { BRACING, HULL, MOORING, PONTOON_TOP, SEGMENTS } from '../../constants';
import { PAINT } from '../../finishes';
import { rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { merge, mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface HullPart {
  object: Group;
  anchors: { pontoon: Object3D; column: Object3D };
}

export const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

const FAIRLEAD = { width: 1.6, height: 2.4, depth: 1.3 } as const;
const MARK_THICKNESS = 0.06;
const MARK_HEIGHT = 0.22;
const LONG_MARK = 1.6;
const LABEL_SHARE = { pontoonX: 0.42, columnY: 5 } as const;

function pontoonGeometry(sideZ: number): BufferGeometry {
  const { length, width } = HULL.pontoon;
  const centre = sideZ * HULL.pontoon.offset;
  const outline = roundedRectShape(
    { minA: -length / 2, maxA: length / 2, minB: centre - width / 2, maxB: centre + width / 2 },
    width / 2,
  );
  return extrudePlan(outline, HULL.keelY, PONTOON_TOP);
}

function columnOutline(x: number, z: number): PlanPoint[] {
  const half = HULL.column.size / 2;
  const cut = half - HULL.column.chamfer;
  return [
    { x: x - cut, z: z - half },
    { x: x + cut, z: z - half },
    { x: x + half, z: z - cut },
    { x: x + half, z: z + cut },
    { x: x + cut, z: z + half },
    { x: x - cut, z: z + half },
    { x: x - half, z: z + cut },
    { x: x - half, z: z - cut },
  ];
}

function columnBands(x: number, z: number): (readonly [BufferGeometry, ColorRepresentation])[] {
  const outline = planShape(columnOutline(x, z));
  const band = HULL.waterline.halfBand;
  return [
    [extrudePlan(outline, PONTOON_TOP, -band), PAINT.hullRed],
    [extrudePlan(outline, -band, band), PAINT.bootTop],
    [extrudePlan(outline, band, HULL.deck.underside), PAINT.hullGrey],
  ];
}

function draftMarks(x: number, z: number, side: number): BufferGeometry[] {
  const face = z + side * (HULL.column.size / 2);
  const { markFrom, markTo, markStep, markWidth } = HULL.waterline;
  const marks: BufferGeometry[] = [];
  for (let y = markFrom; y <= markTo; y += markStep) {
    const width = y % (markStep * 2) === 0 ? LONG_MARK : markWidth / 2;
    marks.push(
      box({
        minX: x - width,
        maxX: x,
        minY: y,
        maxY: y + MARK_HEIGHT,
        minZ: Math.min(face, face + side * MARK_THICKNESS),
        maxZ: Math.max(face, face + side * MARK_THICKNESS),
      }),
    );
  }
  return marks;
}

export function fairleadPoints(): Point[] {
  const outer = HULL.column.offset + HULL.column.size / 2;
  const along = HULL.column.offset + HULL.column.size / 2 - MOORING.cornerInset;
  return CORNERS.flatMap(([sx, sz]): Point[] => [
    [sx * outer, MOORING.fairleadY, sz * along],
    [sx * along, MOORING.fairleadY, sz * outer],
  ]);
}

function fairleads(): BufferGeometry[] {
  return fairleadPoints().map(([x, y, z]) =>
    box({
      minX: x - FAIRLEAD.width / 2,
      maxX: x + FAIRLEAD.width / 2,
      minY: y - FAIRLEAD.height / 2,
      maxY: y + FAIRLEAD.height / 2,
      minZ: z - FAIRLEAD.depth / 2,
      maxZ: z + FAIRLEAD.depth / 2,
    }),
  );
}

function columnsGeometry(): BufferGeometry {
  const { offset } = HULL.column;
  const parts = CORNERS.flatMap(([sx, sz]) => {
    const x = sx * offset;
    const z = sz * offset;
    return [
      ...columnBands(x, z),
      ...draftMarks(x, z, sz).map((mark) => [mark, PAINT.mark] as const),
    ];
  });
  const sheaves = fairleads().map((sheave) => [sheave, PAINT.darkSteel] as const);
  return mergePainted([...parts, ...sheaves]);
}

function braceNode(at: Point, axis: 'x' | 'z'): BufferGeometry {
  const reach = BRACING.nodeLength / 2;
  const [x, y, z] = at;
  const from: Point = axis === 'z' ? [x, y, z - reach] : [x - reach, y, z];
  const to: Point = axis === 'z' ? [x, y, z + reach] : [x + reach, y, z];
  return rodGeometry(from, to, BRACING.nodeRadius, SEGMENTS.round);
}

function bracingGeometry(): BufferGeometry {
  const inner = HULL.column.offset - HULL.column.size / 2;
  const x = HULL.column.offset;
  const { horizontalY, diagonalLowY, diagonalTopZ, radius } = BRACING;
  const top = HULL.deck.underside;
  const parts = [-1, 1].flatMap((sx) => [
    rodGeometry(
      [sx * x, horizontalY, -inner],
      [sx * x, horizontalY, inner],
      radius,
      SEGMENTS.round,
    ),
    rodGeometry([sx * x, diagonalLowY, inner], [sx * x, top, diagonalTopZ], radius, SEGMENTS.round),
    rodGeometry(
      [sx * x, diagonalLowY, -inner],
      [sx * x, top, -diagonalTopZ],
      radius,
      SEGMENTS.round,
    ),
    braceNode([sx * x, horizontalY, inner], 'z'),
    braceNode([sx * x, horizontalY, -inner], 'z'),
  ]);
  return merge(parts);
}

export function createHull(context: PartContext): HullPart {
  const object = new Group();
  const pontoons = merge([pontoonGeometry(1), pontoonGeometry(-1)]);
  object.add(
    partMesh(context, pontoons, 'pontoon', 'hull'),
    partMesh(context, columnsGeometry(), 'column', 'painted'),
    partMesh(context, bracingGeometry(), STRUCTURE_GROUP, 'hull'),
  );
  const pontoonFront = HULL.pontoon.offset + HULL.pontoon.width / 2;
  const columnFront = HULL.column.offset + HULL.column.size / 2;
  return {
    object,
    anchors: {
      pontoon: anchorAt(
        object,
        (HULL.pontoon.length / 2) * LABEL_SHARE.pontoonX,
        (HULL.keelY + PONTOON_TOP) / 2,
        pontoonFront,
      ),
      column: anchorAt(object, HULL.column.offset, LABEL_SHARE.columnY, columnFront),
    },
  };
}

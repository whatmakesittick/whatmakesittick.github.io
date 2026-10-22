import { Group } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { PLINTH, SLICE } from './constants';
import { finishMesh, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';

export const PLINTH_NAME = 'lineUpPlinth';

export function slabOutline(halfWidth: number): Point2[] {
  const { top, chamfer, slab } = PLINTH;
  const bottom = top - slab;
  return [
    [-halfWidth, bottom],
    [halfWidth, bottom],
    [halfWidth, top - chamfer],
    [halfWidth - chamfer, top],
    [-halfWidth + chamfer, top],
    [-halfWidth, top - chamfer],
  ];
}

function baseOutline(halfWidth: number): Point2[] {
  const { bottom, top, slab } = PLINTH;
  return [
    [-halfWidth, bottom],
    [halfWidth, bottom],
    [halfWidth, top - slab],
    [-halfWidth, top - slab],
  ];
}

export function buildPlinth(context: PartContext, halfWidth: number): Group {
  const { overhang, slabLip, baseInset } = PLINTH;
  const slab = sliceGeometry(
    [slabOutline(halfWidth + slabLip)],
    SLICE.start - overhang - slabLip,
    SLICE.end + overhang + slabLip,
  );
  const base = sliceGeometry(
    [baseOutline(halfWidth - baseInset)],
    SLICE.start - overhang + baseInset,
    SLICE.end + overhang - baseInset,
  );
  const plinth = new Group();
  plinth.name = PLINTH_NAME;
  plinth.add(
    finishMesh(context, slab, STRUCTURE_GROUP, LINE_UP_FINISHES.plinth),
    finishMesh(context, base, STRUCTURE_GROUP, LINE_UP_FINISHES.plinthBase),
  );
  return plinth;
}

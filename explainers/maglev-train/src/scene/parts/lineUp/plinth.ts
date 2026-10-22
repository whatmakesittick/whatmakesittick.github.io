import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { PLINTH, SLICE } from './constants';
import { finishMesh, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';

export function plinthOutline(halfWidth: number): Point2[] {
  const { bottom, top, chamfer } = PLINTH;
  return [
    [-halfWidth, bottom],
    [halfWidth, bottom],
    [halfWidth, top - chamfer],
    [halfWidth - chamfer, top],
    [-halfWidth + chamfer, top],
    [-halfWidth, top - chamfer],
  ];
}

export function buildPlinth(context: PartContext, halfWidth: number): Mesh {
  const geometry = sliceGeometry(
    [plinthOutline(halfWidth)],
    SLICE.start - PLINTH.overhang,
    SLICE.end + PLINTH.overhang,
  );
  const mesh = finishMesh(context, geometry, STRUCTURE_GROUP, LINE_UP_FINISHES.plinth);
  mesh.name = 'lineUpPlinth';
  return mesh;
}

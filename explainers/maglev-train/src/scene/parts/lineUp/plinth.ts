import type { Group } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { finishMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { PLINTH, SLICE } from './constants';
import { sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { trapezoid } from './layout';

export const PLINTH_NAME = 'lineUpPlinth';
const LABEL_BACK = 1.5;

export interface StandSpec {
  readonly part: 'wheelRail' | 'scmaglev';
  readonly z: number;
  readonly plinthHalfWidth: number;
  readonly labelY: number;
}

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
  return trapezoid(halfWidth, halfWidth, bottom, top - slab);
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
  const plinth = namedGroup(PLINTH_NAME);
  plinth.add(
    finishMesh(context, slab, STRUCTURE_GROUP, LINE_UP_FINISHES.plinth),
    finishMesh(context, base, STRUCTURE_GROUP, LINE_UP_FINISHES.plinthBase),
  );
  return plinth;
}

export function buildStand(context: PartContext, spec: StandSpec): Group {
  const group = namedGroup(spec.part);
  group.position.z = spec.z;
  group.add(buildPlinth(context, spec.plinthHalfWidth));
  label(context, spec.part, group, [SLICE.end - LABEL_BACK, spec.labelY, 0]);
  return group;
}

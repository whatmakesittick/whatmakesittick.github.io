import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { MINUTE_WHEEL_CENTRE, WHEEL_CENTRES } from '../../../model/layout';
import { MOVEMENT_RADIUS_MM } from '../../../model/scale';
import { ANCHOR_LIFT_MM, BEVEL, MAINPLATE, SEGMENTS } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { mergeGrouped } from '../../geometry/merge';
import { circlePoints, circleUnion } from '../../geometry/outline';
import { layeredMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN = { x: 0, y: 0 };
const LABEL_AT = { x: 3.2, y: -11.6 };

function plateGeometry(): BufferGeometry {
  const [bottom, top] = MAINPLATE.span;
  const { recess, holes } = MAINPLATE;
  const outline = circlePoints({ ...ORIGIN, r: MOVEMENT_RADIUS_MM }, SEGMENTS.plate);
  const centreHole = circlePoints({ ...ORIGIN, r: holes.centre }, SEGMENTS.hub);
  const fourthHole = circlePoints({ ...WHEEL_CENTRES.fourthWheel, r: holes.fourth }, SEGMENTS.hub);
  const sink = circleUnion(
    { ...ORIGIN, r: recess.centreRadius },
    { ...MINUTE_WHEEL_CENTRE, r: recess.minuteRadius },
    SEGMENTS.disc,
  );
  const upper = extrudeOutline(outline, recess.split, top, [centreHole, fourthHole], BEVEL.plate);
  const lower = extrudeOutline(outline, bottom, recess.split, [sink, fourthHole], BEVEL.plate);
  return mergeGrouped([{ geometry: upper }, { geometry: lower }]);
}

export function createMainplate(context: PartContext, frame: Object3D): Object3D {
  const { plate, bevel } = context.surfaces;
  frame.add(layeredMesh(context, plateGeometry(), 'mainplate', [plate, bevel]));
  return anchorAt(frame, LABEL_AT.x, LABEL_AT.y, MAINPLATE.span[1] + ANCHOR_LIFT_MM);
}

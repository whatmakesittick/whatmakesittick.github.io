import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { WHEEL_CENTRES } from '../../../model/layout';
import { DIAL_RADIUS_MM, LEVELS } from '../../../model/scale';
import { ANCHOR_LIFT_MM, DIAL_FACE, SEGMENTS } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { circlePoints } from '../../geometry/outline';
import { block, disc } from '../../geometry/solids';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN = { x: 0, y: 0 };
const HOURS = 12;
const HOUR_DEG = 30;
const LABEL_RADIUS = 8.6;
const LABEL_DEG = 225;

function faceGeometry(): BufferGeometry {
  const [back, front] = [LEVELS.dial[0], LEVELS.dial[1]];
  const outline = circlePoints({ ...ORIGIN, r: DIAL_RADIUS_MM }, SEGMENTS.plate);
  const holes = [
    circlePoints({ ...ORIGIN, r: DIAL_FACE.centreHole }, SEGMENTS.hub),
    circlePoints({ ...WHEEL_CENTRES.fourthWheel, r: DIAL_FACE.subDialHole }, SEGMENTS.hub),
  ];
  return extrudeOutline(outline, back, front, holes);
}

function baton(angle: number, offset: number): BufferGeometry {
  const { inner, outer, width, height } = DIAL_FACE.marker;
  const middle = (inner + outer) / 2;
  const face = LEVELS.dial[0];
  const geometry = block([offset, middle, face - height / 2], [width, outer - inner, height]);
  geometry.rotateZ(angle);
  return geometry;
}

function markersGeometry(): BufferGeometry {
  const { twinGap } = DIAL_FACE.marker;
  const batons = Array.from({ length: HOURS }, (_, hour) => {
    const angle = toRadians(hour * HOUR_DEG);
    return hour === 0 ? [baton(angle, -twinGap), baton(angle, twinGap)] : [baton(angle, 0)];
  }).flat();
  const feet = DIAL_FACE.feet.map((foot) =>
    disc({ ...foot, r: DIAL_FACE.footRadius }, [LEVELS.dial[1], LEVELS.mainplate[0]], SEGMENTS.pin),
  );
  return merge([...batons, ...feet]);
}

export function createDial(context: PartContext, frame: Object3D): Object3D {
  frame.add(
    finishMesh(context, faceGeometry(), 'dial', context.surfaces.dial),
    partMesh(context, markersGeometry(), 'dial', 'dialMarker'),
  );
  const angle = toRadians(LABEL_DEG);
  return anchorAt(
    frame,
    -Math.sin(angle) * LABEL_RADIUS,
    Math.cos(angle) * LABEL_RADIUS,
    LEVELS.dial[0] - ANCHOR_LIFT_MM,
  );
}

import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE } from '../../../model/layout';
import { ANCHOR_LIFT_MM, BALANCE_COCK, BEVEL, SEGMENTS } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { mergeGrouped } from '../../geometry/merge';
import type { Circle, Vec2 } from '../../geometry/outline';
import {
  alongAxis,
  circlePoints,
  hullOfCircles,
  polarDeg,
  smoothOutline,
} from '../../geometry/outline';
import { layeredMesh } from '../context';
import type { PartContext } from '../context';

const FOOT = polarDeg(BALANCE_CENTRE, BALANCE_COCK.footDistance, BALANCE_COCK.footDeg);
const LABEL_SHARE = 0.55;
const OUTLINE_SAMPLES = 8;

export function cockFeet(): readonly Circle[] {
  return [-1, 1].map((side) => ({
    ...polarDeg(FOOT, BALANCE_COCK.footSpread * side, BALANCE_COCK.footDeg + 90),
    r: BALANCE_COCK.footRadius,
  }));
}

function cockGeometry(): BufferGeometry {
  const feet = cockFeet();
  const [armBottom, armTop] = BALANCE_COCK.arm;
  const hole = circlePoints({ ...BALANCE_CENTRE, r: BALANCE_COCK.settingHole }, SEGMENTS.hub);
  const pillar = extrudeOutline(hullOfCircles(feet, SEGMENTS.hub), 0, armBottom);
  const outline = smoothOutline(
    alongAxis(BALANCE_CENTRE, FOOT, BALANCE_COCK.outline),
    OUTLINE_SAMPLES,
  );
  const arm = extrudeOutline(outline, armBottom, armTop, [hole], BEVEL.cock);
  return mergeGrouped([{ geometry: pillar }, { geometry: arm }]);
}

export function createBalanceCock(context: PartContext, frame: Object3D): Object3D {
  const { bridge, bevel } = context.surfaces;
  frame.add(layeredMesh(context, cockGeometry(), 'balanceCock', [bridge, bevel]));
  const at: Vec2 = {
    x: BALANCE_CENTRE.x + (FOOT.x - BALANCE_CENTRE.x) * LABEL_SHARE,
    y: BALANCE_CENTRE.y + (FOOT.y - BALANCE_CENTRE.y) * LABEL_SHARE,
  };
  return anchorAt(frame, at.x, at.y, BALANCE_COCK.arm[1] + ANCHOR_LIFT_MM);
}

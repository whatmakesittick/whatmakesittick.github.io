import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE, HAIRSPRING } from '../../../model/layout';
import { ANCHOR_LIFT_MM, HAIRSPRING_RIBBON, SEGMENTS, STUD_BLOCK } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { hullOfCircles, polarDeg } from '../../geometry/outline';
import { block, ring } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const ARM_TIP_SHARE = 0.7;

function studGeometry(): BufferGeometry {
  const { span, size, carrier } = STUD_BLOCK;
  const deg = HAIRSPRING_RIBBON.studDeg;
  const at = polarDeg(BALANCE_CENTRE, HAIRSPRING.studRadiusMm, deg);
  const stud = block(
    [at.x, at.y, (span[0] + span[1]) / 2],
    [size.radial, size.tangential, span[1] - span[0]],
    toRadians(deg),
  );
  const start = polarDeg(BALANCE_CENTRE, (carrier.inner + carrier.outer) / 2, deg);
  const end = polarDeg(BALANCE_CENTRE, carrier.reach, deg);
  const arm = hullOfCircles(
    [
      { ...start, r: carrier.width / 2 },
      { ...end, r: (carrier.width / 2) * ARM_TIP_SHARE },
    ],
    SEGMENTS.hub,
  );
  return merge([
    stud,
    ring(BALANCE_CENTRE, carrier.inner, carrier.outer, carrier.level, SEGMENTS.hub),
    extrudeOutline(arm, carrier.level[0], carrier.level[1]),
  ]);
}

export function createStud(context: PartContext, frame: Object3D): Object3D {
  frame.add(partMesh(context, studGeometry(), 'stud', 'steel'));
  const at = polarDeg(BALANCE_CENTRE, HAIRSPRING.studRadiusMm, HAIRSPRING_RIBBON.studDeg);
  return anchorAt(frame, at.x, at.y, STUD_BLOCK.span[1] + ANCHOR_LIFT_MM);
}

import { Group } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { WHEEL_CENTRES } from '../../../model/layout';
import { WINDING } from '../../../model/train';
import { ANCHOR_LIFT_MM, RATCHET, SEGMENTS, WINDING_SAW } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { sawProfile } from '../../geometry/gear';
import { polarDeg } from '../../geometry/outline';
import { slottedHead } from '../../geometry/screw';
import { crossingHoles } from '../../geometry/wheel';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { WINDING_SENSE } from './windingPhases';

const LABEL_DEG = 100;

function ratchetGeometry(phase: number) {
  const outline = sawProfile(
    WINDING.ratchetTeeth,
    WINDING.ratchetRadiusMm,
    WINDING_SAW,
    phase,
    WINDING_SENSE,
  );
  const rimInner = WINDING.ratchetRadiusMm - WINDING_SAW.depth / 2 - RATCHET.rimWidth;
  const holes = crossingHoles({ ...RATCHET.spokes, rimInner }, SEGMENTS.outline);
  return extrudeOutline(outline, RATCHET.level[0], RATCHET.level[1], holes);
}

function screwGeometry() {
  const head = slottedHead({ ...RATCHET.screw, dome: RATCHET.screw.height / 3 }, SEGMENTS.hub);
  head.translate(0, 0, RATCHET.level[1]);
  return head;
}

export class RatchetWheelPart {
  readonly object = new Group();
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D, phase: number) {
    const centre = WHEEL_CENTRES.barrel;
    this.object.position.set(centre.x, centre.y, 0);
    const finish = context.surfaces.sunray(WINDING.ratchetRadiusMm);
    this.object.add(
      finishMesh(context, ratchetGeometry(phase), 'ratchetWheel', finish),
      partMesh(context, screwGeometry(), 'ratchetWheel', 'brightSteel'),
    );
    frame.add(this.object);
    const at = polarDeg(centre, WINDING.ratchetRadiusMm - RATCHET.rimWidth / 2, LABEL_DEG);
    this.label = anchorAt(frame, at.x, at.y, RATCHET.level[1] + ANCHOR_LIFT_MM);
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}

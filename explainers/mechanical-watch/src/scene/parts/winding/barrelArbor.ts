import { Group } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { WHEEL_CENTRES } from '../../../model/layout';
import { ANCHOR_LIFT_MM, BARREL_ARBOR, BARREL_DRUM, SEGMENTS } from '../../constants';
import { latheZ } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { block } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { ARBOR_HOOK_ANGLE } from '../train/mainspring';

function arborGeometry() {
  const { pivot, journal, core, square, hook } = BARREL_ARBOR;
  const body = latheZ(
    [
      [0, pivot.span[0]],
      [pivot.radius, pivot.span[0]],
      [pivot.radius, pivot.span[1]],
      [journal.radius, pivot.span[1]],
      [journal.radius, core.span[0]],
      [core.radius, core.span[0]],
      [core.radius, core.span[1]],
      [journal.radius, core.span[1]],
      [journal.radius, square.span[0]],
      [0, square.span[0]],
    ],
    SEGMENTS.hub,
  );
  const squareHeight = square.span[1] - square.span[0];
  const seat = block(
    [0, 0, (square.span[0] + square.span[1]) / 2],
    [square.half * 2, square.half * 2, squareHeight],
  );
  const hookRadius = core.radius + hook.depth / 2;
  const hookHeight = hook.span[1] - hook.span[0];
  const barb = block(
    [
      hookRadius * Math.cos(ARBOR_HOOK_ANGLE),
      hookRadius * Math.sin(ARBOR_HOOK_ANGLE),
      (hook.span[0] + hook.span[1]) / 2,
    ],
    [hook.depth, hook.width, hookHeight],
    ARBOR_HOOK_ANGLE,
  );
  return merge([body, seat, barb]);
}

export class BarrelArborPart {
  readonly object = new Group();
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D) {
    const centre = WHEEL_CENTRES.barrel;
    this.object.position.set(centre.x, centre.y, 0);
    this.object.add(partMesh(context, arborGeometry(), 'barrelArbor', 'steel'));
    frame.add(this.object);
    const angle = toRadians(BARREL_DRUM.sectorCentreDeg);
    const reach = BARREL_ARBOR.core.radius;
    this.label = anchorAt(
      frame,
      centre.x + reach * Math.cos(angle),
      centre.y + reach * Math.sin(angle),
      BARREL_ARBOR.core.span[1] + ANCHOR_LIFT_MM,
    );
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}

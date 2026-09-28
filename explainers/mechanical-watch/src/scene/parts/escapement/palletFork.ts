import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { PALLET_STAFF } from '../../../model/layout';
import { ANCHOR_LIFT_MM, BEVEL, FORK, PALLETS, SEGMENTS } from '../../constants';
import { rubyMaterial } from '../../finishes';
import { extrudeOutline } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { hullOfCircles } from '../../geometry/outline';
import { arbor, rod } from '../../geometry/solids';
import { partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';
import {
  LEVER_LINE,
  forkOutline,
  guardPinTip,
  slotBottom,
  stoneLayout,
  stoneOuterCentre,
} from './palletLayout';
import type { StoneId } from './palletLayout';

const STONES: readonly StoneId[] = ['entry', 'exit'];
const STONE_PARTS: Readonly<Record<StoneId, PartId>> = { entry: 'entryPallet', exit: 'exitPallet' };
const GUARD_PIN_ROOT_SHARE = 0.92;
const STONE_LABEL_SHARE = 0.5;
const LEVER_LABEL_SHARE = 0.55;

function frameGeometry(): BufferGeometry {
  const staff = { x: 0, y: 0, r: PALLETS.frameHalfWidth };
  const arms = (['entry', 'exit'] as const).map((id) => {
    const outline = hullOfCircles(
      [staff, { ...stoneOuterCentre(id), r: PALLETS.frameReach }],
      SEGMENTS.hub,
    );
    return extrudeOutline(outline, PALLETS.frame[0], PALLETS.frame[1]);
  });
  return merge(arms);
}

function forkGeometry(): BufferGeometry {
  const lever = extrudeOutline(forkOutline(), FORK.level[0], FORK.level[1], [], BEVEL.lever);
  const tip = guardPinTip();
  const { radius, level } = FORK.guardPin;
  const z = (level[0] + level[1]) / 2;
  const guard = rod(
    [slotBottom() * GUARD_PIN_ROOT_SHARE, 0, z],
    [tip.x, tip.y, z],
    radius,
    SEGMENTS.pin,
  );
  const staff = arbor(FORK.staff, SEGMENTS.arbor);
  return merge([lever, frameGeometry(), guard, staff]);
}

export class PalletForkPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly labels: Readonly<Record<'palletFork' | 'entryPallet' | 'exitPallet', Object3D>>;

  constructor(context: PartContext, frame: Object3D) {
    this.object.position.set(PALLET_STAFF.x, PALLET_STAFF.y, 0);
    this.object.add(partMesh(context, forkGeometry(), 'palletFork', 'steel'));
    STONES.forEach((id) => {
      const geometry = extrudeOutline(stoneLayout(id).corners, PALLETS.stone[0], PALLETS.stone[1]);
      this.object.add(registeredMesh(context, geometry, STONE_PARTS[id], rubyMaterial()));
    });
    frame.add(this.object);
    const leverTop = FORK.level[1] + ANCHOR_LIFT_MM;
    this.anchor = anchorAt(frame, PALLET_STAFF.x, PALLET_STAFF.y, leverTop);
    this.labels = {
      palletFork: anchorAt(this.object, slotBottom() * LEVER_LABEL_SHARE, 0, leverTop),
      entryPallet: this.stoneLabel('entry'),
      exitPallet: this.stoneLabel('exit'),
    };
  }

  setAngle(forkDeg: number): void {
    this.object.rotation.z = LEVER_LINE + toRadians(forkDeg);
  }

  private stoneLabel(id: StoneId): Object3D {
    const corner = stoneLayout(id).lockingCorner;
    const outer = stoneOuterCentre(id);
    const x = corner.x + (outer.x - corner.x) * STONE_LABEL_SHARE;
    const y = corner.y + (outer.y - corner.y) * STONE_LABEL_SHARE;
    return anchorAt(this.object, x, y, PALLETS.frame[1] + ANCHOR_LIFT_MM);
  }
}

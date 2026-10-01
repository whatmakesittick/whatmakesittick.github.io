import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PART_IDS } from '../../ids';
import type { AnchorId, PartId } from '../../ids';
import {
  BARREL,
  BULLET_SEAT_X,
  CHARGING_HANDLE,
  CLEANING_ROD,
  EJECTION_PORT,
  FRONT_SIGHT,
  GAS_BLOCK,
  GAS_CYLINDER,
  GAS_PORT_X,
  GAS_TUBE,
  HAMMER,
  RECEIVER,
  TRIGGER,
} from '../../model/layout';
import type { Point } from '../../model/scale';
import { COMPENSATOR, MAGAZINE_ARC, magazinePoint } from '../constants';

const LIFT = 0.6;

export interface LabelPlacement {
  whole: Point;
  cut: Point;
}

function fixed(point: Point): LabelPlacement {
  return { whole: point, cut: point };
}

function magazineMiddle(z: number): Point {
  const [x, y] = magazinePoint(MAGAZINE_ARC.radius, MAGAZINE_ARC.sweep / 2);
  return [x, y, z];
}

const MUZZLE_X = (COMPENSATOR.x[0] + COMPENSATOR.x[1]) / 2;
const GAS_BLOCK_X = (GAS_BLOCK.x[0] + GAS_BLOCK.x[1]) / 2;
const VENT_X = 267;

export const LABEL_PLACEMENTS: Readonly<Record<PartId, LabelPlacement>> = {
  barrel: { whole: [230, 0, BARREL.radius], cut: [230, 6, LIFT] },
  chamber: { whole: [16, 0, BARREL.radius + LIFT], cut: [20, 0, -2] },
  muzzle: { whole: [MUZZLE_X, 0, COMPENSATOR.outer + LIFT], cut: [MUZZLE_X, -7, LIFT] },
  rifling: { whole: [360, 0, 9], cut: [360, 0, -3] },
  trunnion: { whole: [6, 0, 14 + LIFT], cut: [-15, -12, LIFT] },
  bolt: fixed([-35, 0, LIFT]),
  firingPin: fixed([-60, 0, LIFT]),
  extractor: fixed([-6, 6, LIFT]),
  carrier: { whole: [-90, 18, RECEIVER.z[1] + LIFT], cut: [-90, 18, LIFT] },
  chargingHandle: fixed([-50, 17, CHARGING_HANDLE.z[1] + LIFT]),
  pistonRod: { whole: [150, GAS_TUBE.axisY, 13.5], cut: [150, GAS_TUBE.axisY, LIFT] },
  pistonHead: fixed([281, GAS_CYLINDER.axisY, LIFT]),
  gasBlock: { whole: [GAS_BLOCK_X, 10, 12.5], cut: [GAS_BLOCK_X, -6, LIFT] },
  gasPort: { whole: [GAS_PORT_X, 10, 12.5], cut: [GAS_PORT_X + 6, 10, LIFT] },
  gasTube: { whole: [220, GAS_TUBE.axisY, GAS_TUBE.radius + LIFT], cut: [220, 32, LIFT] },
  ventHoles: { whole: [VENT_X, 28.5, 7.8 + LIFT], cut: [VENT_X, 28.5, -7] },
  returnSpring: fixed([-180, 18, LIFT]),
  hammer: fixed([HAMMER.centre[0], HAMMER.centre[1] + 10, LIFT]),
  trigger: {
    whole: [TRIGGER.centre[0] + 4, -38, 3 + LIFT],
    cut: [TRIGGER.centre[0] + 4, -38, LIFT],
  },
  selector: { whole: [-115, 8, 17.5], cut: [-160, 14, -14] },
  ejector: fixed([-75, 10, -10]),
  receiver: { whole: [-200, 0, RECEIVER.z[1] + LIFT], cut: [-200, 0, -14.5] },
  magazine: { whole: magazineMiddle(11 + LIFT), cut: magazineMiddle(-9.5) },
  cartridgeCase: fixed([15, 5, LIFT]),
  primer: fixed([1, 0, LIFT]),
  powder: fixed([12, 0, LIFT]),
  bullet: fixed([BULLET_SEAT_X + 10, 0, LIFT]),
  spentCase: fixed([-40, 10, 20]),
  hotGas: fixed([150, 0, LIFT]),
  stock: { whole: [-380, -10, 17.5], cut: [-380, -10, LIFT] },
  grip: { whole: [-232, -60, 13 + LIFT], cut: [-232, -60, LIFT] },
  handguard: { whole: [120, -10, 18 + LIFT], cut: [120, -18, LIFT] },
  rearSight: { whole: [44, 36, 6 + LIFT], cut: [44, 30, LIFT] },
  frontSight: { whole: [FRONT_SIGHT.x, FRONT_SIGHT.y, 1 + LIFT], cut: [FRONT_SIGHT.x, 36, LIFT] },
  cleaningRod: {
    whole: [240, CLEANING_ROD.axisY, CLEANING_ROD.radius + LIFT],
    cut: [240, CLEANING_ROD.axisY, LIFT],
  },
};

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  muzzle: [BARREL.x[1], 0, 0],
  chamber: [20, 0, 0],
  gasBlock: [GAS_BLOCK_X, GAS_BLOCK.y[1], 0],
  carrier: [-60, 18, 0],
  bolt: [-35, 0, 0],
  hammer: HAMMER.centre,
  magazine: magazineMiddle(0),
  ejectionPort: [(EJECTION_PORT.x[0] + EJECTION_PORT.x[1]) / 2, 10, RECEIVER.z[1]],
  bullet: [BULLET_SEAT_X, 0, 0],
};

export class LabelAnchors {
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors = new Map<AnchorId, Object3D>();

  constructor(parent: Object3D) {
    for (const id of Object.keys(ANCHOR_POINTS) as AnchorId[]) {
      this.anchors.set(id, anchorAt(parent, ...ANCHOR_POINTS[id]));
    }
    for (const id of PART_IDS) this.labels.set(id, anchorAt(parent, ...LABEL_PLACEMENTS[id].whole));
  }

  setCutaway(cut: boolean): void {
    for (const id of PART_IDS) {
      const placement = LABEL_PLACEMENTS[id];
      this.labels.get(id)?.position.set(...(cut ? placement.cut : placement.whole));
    }
  }
}

import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PART_IDS } from '../../ids';
import type { AnchorId, PartId } from '../../ids';
import {
  BARREL,
  CHARGING_HANDLE,
  CLEANING_ROD,
  EJECTION_PORT,
  EJECTOR_X,
  FRONT_SIGHT,
  GAS_BLOCK,
  GAS_CYLINDER,
  GAS_PORT_X,
  GAS_TUBE,
  PISTON,
  RECEIVER,
  SELECTOR,
} from '../../model/layout';
import type { Point } from '../../model/scale';
import {
  COMPENSATOR,
  EJECTOR_BLOCK,
  MAGAZINE_ARC,
  RETURN_SPRING_LABEL_X,
  SELECTOR_LEVER,
  SHEET,
  VENT_HOLE,
  magazinePoint,
} from '../constants';

export type LabelHost =
  | 'body'
  | 'carrier'
  | 'bolt'
  | 'features'
  | 'hammer'
  | 'trigger'
  | 'bullet'
  | 'live'
  | 'spent'
  | 'gas';

export interface LabelPlacement {
  host: LabelHost;
  whole: Point;
  cut: Point;
}

const LIFT = 0.4;
const SELECTOR_SPOT = { along: 15, across: 1, lift: 0.2 } as const;

function selectorLabel(): Point {
  const [x, y, surface] = SELECTOR.centre;
  const { along, across, lift } = SELECTOR_SPOT;
  const angle = SELECTOR_LEVER.autoAngle;
  return [
    x + along * Math.cos(angle) - across * Math.sin(angle),
    y + along * Math.sin(angle) + across * Math.cos(angle),
    surface + SELECTOR_LEVER.thickness + lift,
  ];
}

const SELECTOR_LABEL = selectorLabel();
const GAS_BLOCK_X = (GAS_BLOCK.x[0] + GAS_BLOCK.x[1]) / 2;
const MUZZLE_X = (COMPENSATOR.x[0] + COMPENSATOR.x[1]) / 2;
const VENT_X = (VENT_HOLE.xs[0] + VENT_HOLE.xs[1]) / 2;
const VENT_INNER = GAS_TUBE.radius - 1.6;

function on(host: LabelHost, whole: Point, cut: Point = whole): LabelPlacement {
  return { host, whole, cut };
}

function magazineAt(radius: number, z: number): Point {
  const [x, y] = magazinePoint(radius, MAGAZINE_ARC.sweep / 2);
  return [x, y, z];
}

function ventAt(radius: number, side: number): Point {
  const { elevation } = VENT_HOLE;
  return [
    VENT_X,
    GAS_TUBE.axisY + radius * Math.sin(elevation),
    side * radius * Math.cos(elevation),
  ];
}

export const LABEL_PLACEMENTS: Readonly<Record<PartId, LabelPlacement>> = {
  barrel: on('body', [230, 0, 8.7], [230, 6.4, LIFT]),
  chamber: on('body', [16, 0, BARREL.radius + LIFT], [44, 7, LIFT]),
  muzzle: on('body', [MUZZLE_X, 0, COMPENSATOR.outer + LIFT], [MUZZLE_X, -7, LIFT]),
  rifling: on('body', [400, 0, 8.4], [360, 0, -4]),
  trunnion: on('body', [6, 0, 14 + LIFT], [-15, -12, LIFT]),
  bolt: on('bolt', [-50, 3, 7], [-8, -5, 5.8]),
  firingPin: on('bolt', [-111, 0, 1.6], [-32, 1.1, 1.2]),
  extractor: on('features', [-10, 0, 8.7]),
  carrier: on('carrier', [-60, 14, 13 + LIFT], [-100, 27, LIFT]),
  chargingHandle: on('carrier', [-50, 17, CHARGING_HANDLE.z[1] + LIFT]),
  pistonRod: on('carrier', [16, GAS_TUBE.axisY, 5.2], [150, GAS_TUBE.axisY, 5.2]),
  pistonHead: on('carrier', [PISTON.headFrontX - 12, GAS_CYLINDER.axisY + 6.5, 2]),
  gasBlock: on('body', [GAS_BLOCK_X - 11, -8, 9.3], [GAS_BLOCK_X - 11, -17.3, LIFT]),
  gasPort: on('body', [GAS_PORT_X, 12, 11.5], [GAS_PORT_X + 6.5, 10, LIFT]),
  gasTube: on('body', [220, GAS_TUBE.axisY, GAS_TUBE.radius + LIFT], [220, 32.3, LIFT]),
  ventHoles: on('body', ventAt(GAS_TUBE.radius + LIFT, 1), ventAt(VENT_INNER, -1)),
  returnSpring: on('body', [RETURN_SPRING_LABEL_X, 18, 6.2]),
  hammer: on('hammer', [-2, 14, 4.4]),
  trigger: on('trigger', [3, -22, 3.4]),
  selector: on('body', SELECTOR_LABEL),
  ejector: on('body', [EJECTOR_X, EJECTOR_BLOCK.y[1] + 0.2, -6]),
  receiver: on(
    'body',
    [-225, -14, RECEIVER.z[1] + LIFT],
    [-225, -14, RECEIVER.z[0] + SHEET + LIFT],
  ),
  magazine: on(
    'body',
    magazineAt(MAGAZINE_ARC.radius, 11 + LIFT),
    magazineAt(MAGAZINE_ARC.front + SHEET / 2, LIFT),
  ),
  cartridgeCase: on('live', [10, -5.2, 0.2]),
  primer: on('live', [0.8, 0, 2.9], [0.8, -1.4, LIFT]),
  powder: on('live', [17, 0, 4.6], [17, 0, LIFT]),
  bullet: on('bullet', [21, -1.5, 2.5]),
  spentCase: on('spent', [34, 4.4, 0.2]),
  hotGas: on('gas', [0, 0, 0.5]),
  stock: on('body', [-380, -10, 17.3], [-380, -10, LIFT]),
  grip: on('body', [-232, -60, 13.3], [-232, -60, LIFT]),
  handguard: on('body', [120, -10, 18.3], [120, -18, LIFT]),
  rearSight: on('body', [43.5, 36, 7.8], [43.5, 30, LIFT]),
  frontSight: on('body', [409.5, 44, 9.3], [FRONT_SIGHT.x, 38, LIFT]),
  cleaningRod: on(
    'body',
    [240, CLEANING_ROD.axisY, CLEANING_ROD.radius + LIFT],
    [240, CLEANING_ROD.axisY, LIFT],
  ),
};

interface AnchorPlacement {
  host: LabelHost;
  point: Point;
}

export const ANCHOR_PLACEMENTS: Readonly<Record<AnchorId, AnchorPlacement>> = {
  muzzle: { host: 'body', point: [COMPENSATOR.x[1], 0, 0] },
  chamber: { host: 'body', point: [20, 0, 0] },
  gasBlock: { host: 'body', point: [GAS_BLOCK_X, GAS_BLOCK.y[1], 0] },
  carrier: { host: 'carrier', point: [-60, 18, 0] },
  bolt: { host: 'bolt', point: [-35, 0, 0] },
  hammer: { host: 'hammer', point: [0, 10, 0] },
  magazine: { host: 'body', point: magazineAt(MAGAZINE_ARC.radius, 0) },
  ejectionPort: {
    host: 'body',
    point: [(EJECTION_PORT.x[0] + EJECTION_PORT.x[1]) / 2, 10, RECEIVER.z[1]],
  },
  bullet: { host: 'bullet', point: [13, 0, 0] },
};

export class LabelAnchors {
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors = new Map<AnchorId, Object3D>();

  constructor(hosts: Readonly<Record<LabelHost, Object3D>>) {
    for (const id of Object.keys(ANCHOR_PLACEMENTS) as AnchorId[]) {
      const { host, point } = ANCHOR_PLACEMENTS[id];
      this.anchors.set(id, anchorAt(hosts[host], ...point));
    }
    for (const id of PART_IDS) {
      const { host, whole } = LABEL_PLACEMENTS[id];
      this.labels.set(id, anchorAt(hosts[host], ...whole));
    }
  }

  setCutaway(cut: boolean): void {
    for (const id of PART_IDS) {
      const placement = LABEL_PLACEMENTS[id];
      this.labels.get(id)?.position.set(...(cut ? placement.cut : placement.whole));
    }
  }

  label(id: PartId): Object3D {
    const anchor = this.labels.get(id);
    if (!anchor) throw new Error(`Unknown label ${id}`);
    return anchor;
  }
}

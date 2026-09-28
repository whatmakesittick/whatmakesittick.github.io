import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { CROWN_WHEEL_CENTRE, WHEEL_CENTRES } from '../../../model/layout';
import {
  ANCHOR_LIFT_MM,
  BARREL_BRIDGE,
  BEVEL,
  BRIDGE_LEVEL,
  SEGMENTS,
  TRAIN_BRIDGE,
} from '../../constants';
import type { Span } from '../../../model/scale';
import { extrudeOutline } from '../../geometry/extrude';
import { mergeGrouped } from '../../geometry/merge';
import type { GroupedPart } from '../../geometry/merge';
import type { Vec2 } from '../../geometry/outline';
import {
  annularSector,
  circlePoints,
  hullOfCircles,
  smoothOutline,
  subtractCircle,
} from '../../geometry/outline';
import { disc } from '../../geometry/solids';
import { layeredMesh } from '../context';
import type { PartContext } from '../context';

const POLISHED = 1;
const OUTLINE_SAMPLES = 10;
const BARREL_LABEL = { x: -0.9, y: 9.6 };
const TRAIN_LABEL = { x: -3.6, y: -7.4 };

function pillars(points: readonly Vec2[], radius: number, top: number): GroupedPart[] {
  return points.map((point) => ({
    geometry: disc({ ...point, r: radius }, [0, top] as Span, SEGMENTS.hub),
    material: POLISHED,
  }));
}

function barrelBridgeOutline(): Vec2[] {
  const {
    barrelRadius,
    centreRadius,
    pillars: feet,
    pillarRadius,
    crownWheelClearance,
  } = BARREL_BRIDGE;
  const hull = hullOfCircles(
    [
      { ...WHEEL_CENTRES.barrel, r: barrelRadius },
      { ...WHEEL_CENTRES.centreWheel, r: centreRadius },
      ...feet.map((foot) => ({ ...foot, r: pillarRadius })),
    ],
    SEGMENTS.plate,
  );
  return subtractCircle(hull, { ...CROWN_WHEEL_CENTRE, r: crownWheelClearance }, SEGMENTS.plate);
}

function barrelBridgeGeometry(): BufferGeometry {
  const { window, arborHole, pillars: feet, pillarPostRadius } = BARREL_BRIDGE;
  const [bottom, top] = BRIDGE_LEVEL.barrel;
  const opening = annularSector(
    WHEEL_CENTRES.barrel,
    window.inner,
    window.outer,
    toRadians(window.fromDeg),
    toRadians(window.toDeg),
    SEGMENTS.disc,
  );
  const arbor = circlePoints({ ...WHEEL_CENTRES.barrel, r: arborHole }, SEGMENTS.hub);
  const plate = extrudeOutline(barrelBridgeOutline(), bottom, top, [opening, arbor], BEVEL.bridge);
  return mergeGrouped([{ geometry: plate }, ...pillars(feet, pillarPostRadius, bottom)]);
}

function trainBridgeGeometry(): BufferGeometry {
  const { feet, outline, lowArmOutline, pillarPostRadius } = TRAIN_BRIDGE;
  const [bottom, top] = BRIDGE_LEVEL.train;
  const main = smoothOutline(outline, OUTLINE_SAMPLES);
  const arm = smoothOutline(lowArmOutline, OUTLINE_SAMPLES);
  return mergeGrouped([
    { geometry: extrudeOutline(main, bottom, top, [], BEVEL.bridge) },
    {
      geometry: extrudeOutline(
        arm,
        BRIDGE_LEVEL.lowArm[0],
        BRIDGE_LEVEL.lowArm[1],
        [],
        BEVEL.bridge,
      ),
    },
    ...pillars(feet, pillarPostRadius, bottom),
  ]);
}

export interface BridgeLabels {
  readonly barrelBridge: Object3D;
  readonly trainBridge: Object3D;
}

export function createBridges(context: PartContext, frame: Object3D): BridgeLabels {
  const { bridge, bevel } = context.surfaces;
  frame.add(
    layeredMesh(context, barrelBridgeGeometry(), 'barrelBridge', [bridge, bevel]),
    layeredMesh(context, trainBridgeGeometry(), 'trainBridge', [bridge, bevel]),
  );
  return {
    barrelBridge: anchorAt(
      frame,
      BARREL_LABEL.x,
      BARREL_LABEL.y,
      BRIDGE_LEVEL.barrel[1] + ANCHOR_LIFT_MM,
    ),
    trainBridge: anchorAt(
      frame,
      TRAIN_LABEL.x,
      TRAIN_LABEL.y,
      BRIDGE_LEVEL.train[1] + ANCHOR_LIFT_MM,
    ),
  };
}

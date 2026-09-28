import type { Box3, Matrix4 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { Extent, RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { DRILL_FLOOR_Y, SEABED_Y, depthToY } from '../model/scale';
import { BLOCK_BOTTOM_DEPTH_M, LAYERS, RESERVOIR_FLUIDS, TOTAL_DEPTH_M } from '../model/wellPlan';
import {
  BLOCK,
  DERRICK,
  DERRICK_TOP,
  FLAME,
  HULL,
  STAND_LENGTH_M,
  THRUSTER,
  TOP_DRIVE,
} from './constants';
import { archDrop } from './geometry/strata';
import { flareTipPoint } from './geometry/testLine';
import { BOP_TOP } from './parts/well/bop';

const MARGIN = {
  crown: 6,
  keel: THRUSTER.strut.length + THRUSTER.pod.radius * 2,
  rigHalf: HULL.pontoon.length / 2 + THRUSTER.nozzle.radius,
  rigDepth: HULL.deck.size / 2 + 5,
  waterlineBelow: 5,
  waterlineAbove: 40,
  floorBelow: 4,
  topDriveHeight: 11,
  floorHalf: DERRICK.baseHalf + 10,
  seabedBelow: 16,
  seabedAbove: 12,
  seabedHalf: 24,
  wellHalf: 14,
  wellBelow: 6,
  trapHalf: 110,
  trapAbove: 14,
  trapBelow: 2,
  completionBelow: 8,
  completionRight: 18,
  completionFront: 10,
  flameAbove: FLAME.length,
} as const;

const LAYER_TOP = (id: string) => LAYERS.find((layer) => layer.id === id)?.top ?? TOTAL_DEPTH_M;

function lift([low, high]: Extent, offset: number): Extent {
  return [low + offset, high + offset];
}

function trapSpec(offset: number): RegionSpec {
  const reservoirBottom = LAYERS.find((layer) => layer.id === 'reservoir')?.bottom ?? TOTAL_DEPTH_M;
  const low = depthToY(reservoirBottom + archDrop(MARGIN.trapHalf)) - MARGIN.trapBelow;
  const high = depthToY(LAYER_TOP('seal')) + MARGIN.trapAbove;
  return { x: [-MARGIN.trapHalf, MARGIN.trapHalf], y: lift([low, high], offset), z: [-8, 4] };
}

function completionSpec(offset: number): RegionSpec {
  const oil = RESERVOIR_FLUIDS.find((leg) => leg.id === 'oil') ?? RESERVOIR_FLUIDS[0];
  const tip = flareTipPoint();
  return {
    x: [tip.x - MARGIN.completionFront, MARGIN.completionRight],
    y: [depthToY(oil.bottom) + offset - MARGIN.completionBelow, tip.y + MARGIN.flameAbove],
    z: [tip.z - MARGIN.completionFront, MARGIN.completionFront],
  };
}

export function regionSpec(id: RegionId, offset: number): RegionSpec {
  const keel = HULL.keelY - MARGIN.keel;
  const crown = DERRICK_TOP + MARGIN.crown;
  switch (id) {
    case 'scene':
      return {
        x: [-BLOCK.halfWidth, BLOCK.halfWidth],
        y: [depthToY(BLOCK_BOTTOM_DEPTH_M) + offset, crown],
        z: [BLOCK.back, BLOCK.front],
      };
    case 'rig':
      return {
        x: [-MARGIN.rigHalf, MARGIN.rigHalf],
        y: [keel, crown],
        z: [-MARGIN.rigDepth, MARGIN.rigDepth],
      };
    case 'waterline':
      return {
        x: [-MARGIN.rigHalf, MARGIN.rigHalf],
        y: [HULL.keelY - MARGIN.waterlineBelow, MARGIN.waterlineAbove],
        z: [-MARGIN.rigDepth, MARGIN.rigDepth],
      };
    case 'drillFloor':
      return {
        x: [-MARGIN.floorHalf, MARGIN.floorHalf],
        y: [
          DRILL_FLOOR_Y - MARGIN.floorBelow,
          DRILL_FLOOR_Y + TOP_DRIVE.quillLow + STAND_LENGTH_M + MARGIN.topDriveHeight,
        ],
        z: [-MARGIN.floorHalf, MARGIN.floorHalf],
      };
    case 'seabed':
      return {
        x: [-MARGIN.seabedHalf, MARGIN.seabedHalf],
        y: lift([SEABED_Y - MARGIN.seabedBelow, BOP_TOP + MARGIN.seabedAbove], offset),
        z: [-MARGIN.seabedHalf / 2, MARGIN.seabedHalf / 2],
      };
    case 'well':
      return {
        x: [-MARGIN.wellHalf, MARGIN.wellHalf],
        y: lift([depthToY(TOTAL_DEPTH_M) - MARGIN.wellBelow, 0], offset),
        z: [-MARGIN.wellHalf / 2, MARGIN.wellHalf / 2],
      };
    case 'trap':
      return trapSpec(offset);
    case 'completion':
      return completionSpec(offset);
  }
}

export function regionBox(id: RegionId, offset: number, rootMatrix: Matrix4): Box3 {
  return regionFromSpec(regionSpec(id, offset)).applyMatrix4(rootMatrix);
}

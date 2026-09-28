import type { Box3, Matrix4 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import {
  C_RING,
  GATE,
  HEAD,
  MEMBRANE,
  MOTOR_HEIGHT,
  OSCP,
  PERIPHERAL_STALK,
  PUMPS,
  rowOffsetZ,
} from '../model/scale';
import type { Span } from '../model/scale';
import { ringLayout } from './geometry/ringLayout';

export interface RegionState {
  readonly bladeCount: number;
  readonly motorCount: number;
}

export const REGION_MARGIN_NM = 1;
export const SCENE_DEPTH_NM: Span = [-9, OSCP.span[1]];

const HALF = 0.5;

function motorReach(bladeCount: number): number {
  const { growth } = ringLayout(bladeCount);
  return Math.max(
    HEAD.radius,
    GATE.outerRadius + growth,
    PERIPHERAL_STALK.radius + growth + PERIPHERAL_STALK.width * HALF,
  );
}

function around(reach: number, y: Span): RegionSpec {
  return { x: [-reach, reach], y, z: [-reach, reach] };
}

function pumpsSpec(reach: number): RegionSpec {
  const left = PUMPS.complexOne.x - PUMPS.complexOne.radius;
  const bottom = Math.min(PUMPS.complexOne.span[0], MOTOR_HEIGHT[0]);
  return { x: [left, reach], y: [bottom, MOTOR_HEIGHT[1]], z: [-reach, reach] };
}

function rowSpec(reach: number, motorCount: number): RegionSpec {
  const last = rowOffsetZ(Math.max(1, motorCount) - 1);
  return { x: [-reach, reach], y: MOTOR_HEIGHT, z: [last - reach, reach] };
}

export function regionSpec(id: RegionId, state: RegionState): RegionSpec {
  const reach = motorReach(state.bladeCount);
  switch (id) {
    case 'scene':
      return { x: MEMBRANE.patchX, y: SCENE_DEPTH_NM, z: MEMBRANE.patchZ };
    case 'motor':
      return around(reach, MOTOR_HEIGHT);
    case 'rotor':
      return around(GATE.outerRadius + ringLayout(state.bladeCount).growth + REGION_MARGIN_NM, [
        C_RING.height[0] - REGION_MARGIN_NM,
        C_RING.height[1] + REGION_MARGIN_NM,
      ]);
    case 'head':
      return around(HEAD.radius, [HEAD.span[0], OSCP.span[1]]);
    case 'pumps':
      return pumpsSpec(reach);
    case 'row':
      return rowSpec(reach, state.motorCount);
  }
}

export function regionBox(id: RegionId, state: RegionState, frameMatrix: Matrix4): Box3 {
  return regionFromSpec(regionSpec(id, state)).applyMatrix4(frameMatrix);
}

import { lerp, toRadians } from '@core/math';
import { HINGE, MODULE, MODULE_SPEC, mm } from '../../model';
import { FRAME_LIP_THICKNESS_CM } from './moduleLayout';

export const STACK_LAYER_IDS = [
  'backsheet',
  'rearEncapsulant',
  'cellSheet',
  'frontEncapsulant',
  'glass',
] as const;

export type StackLayerId = (typeof STACK_LAYER_IDS)[number];

const DEPTH_SAFE_CM = { backsheet: 0.1, encapsulant: 0.15, cellSheet: 0.08 } as const;

const THICKNESS: Readonly<Record<StackLayerId, { closed: number; open: number }>> = {
  backsheet: { closed: DEPTH_SAFE_CM.backsheet, open: 2 },
  rearEncapsulant: { closed: DEPTH_SAFE_CM.encapsulant, open: 2.5 },
  cellSheet: { closed: DEPTH_SAFE_CM.cellSheet, open: 2 },
  frontEncapsulant: { closed: DEPTH_SAFE_CM.encapsulant, open: 2.5 },
  glass: { closed: mm(MODULE_SPEC.glassMm), open: 4 },
};

export const EXPLODE = { gap: 8, lift: 6, frameDrop: 20, floorClearance: 2 } as const;

export interface LayerPlacement {
  back: number;
  thickness: number;
}

export const CLOSED_FRONT_CM = MODULE.depth - FRAME_LIP_THICKNESS_CM;

const CLOSED_BACK_CM =
  CLOSED_FRONT_CM - STACK_LAYER_IDS.reduce((sum, id) => sum + THICKNESS[id].closed, 0);

export function stackLayout(explode: number): Record<StackLayerId, LayerPlacement> {
  let back = CLOSED_BACK_CM + explode * EXPLODE.lift;
  const entries = STACK_LAYER_IDS.map((id): [StackLayerId, LayerPlacement] => {
    const thickness = lerp(THICKNESS[id].closed, THICKNESS[id].open, explode);
    const placement = { back, thickness };
    back += thickness + explode * EXPLODE.gap;
    return [id, placement];
  });
  return Object.fromEntries(entries) as Record<StackLayerId, LayerPlacement>;
}

export function layerFront(placement: LayerPlacement): number {
  return placement.back + placement.thickness;
}

export function stackFront(explode: number): number {
  return layerFront(stackLayout(explode).glass);
}

export function backsheetShift(explode: number): number {
  return explode * EXPLODE.lift;
}

export function frameDrop(explode: number, tiltDeg: number): number {
  const slope = Math.sin(toRadians(tiltDeg));
  const room = slope > 0 ? (HINGE.y - EXPLODE.floorClearance) / slope : Infinity;
  return explode * Math.min(EXPLODE.frameDrop, room);
}

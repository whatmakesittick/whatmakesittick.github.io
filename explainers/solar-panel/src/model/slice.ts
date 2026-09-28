import { clamp } from '@core/math';
import { absorptionDepthUm } from './optics';

export const SLICE_UM = { width: 600, depth: 400 } as const;
export const FINGER_UM = { width: 30, height: 12, x: 100 } as const;

export const SLICE_LAYER_IDS = [
  'pyramids',
  'arCoating',
  'emitter',
  'junction',
  'base',
  'rearPassivation',
  'rearContact',
] as const;

export type SliceLayerId = (typeof SLICE_LAYER_IDS)[number];

export interface SliceLayer {
  id: SliceLayerId;
  trueUm: number;
  drawnUm: number;
}

export const SLICE_LAYERS: readonly SliceLayer[] = [
  { id: 'pyramids', trueUm: 6, drawnUm: 6 },
  { id: 'arCoating', trueUm: 0.075, drawnUm: 3 },
  { id: 'emitter', trueUm: 0.5, drawnUm: 8 },
  { id: 'junction', trueUm: 0.5, drawnUm: 6 },
  { id: 'base', trueUm: 139, drawnUm: 110 },
  { id: 'rearPassivation', trueUm: 0.1, drawnUm: 3 },
  { id: 'rearContact', trueUm: 20, drawnUm: 10 },
];

export const CARRIER_FLOW = { electronsTo: 'rearContact', holesTo: 'emitter' } as const;

const WAFER_LAYERS: readonly SliceLayerId[] = ['emitter', 'junction', 'base'];

export function sliceLayer(id: SliceLayerId): SliceLayer {
  const layer = SLICE_LAYERS.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`Unknown slice layer ${id}`);
  return layer;
}

export function drawnThicknessUm(): number {
  return SLICE_LAYERS.reduce((sum, layer) => sum + layer.drawnUm, 0);
}

export function waferThicknessUm(): number {
  return WAFER_LAYERS.reduce((sum, id) => sum + sliceLayer(id).trueUm, 0);
}

export function layerTopUm(id: SliceLayerId): number {
  let top = drawnThicknessUm();
  for (const layer of SLICE_LAYERS) {
    if (layer.id === id) return top;
    top -= layer.drawnUm;
  }
  return top;
}

export function layerBottomUm(id: SliceLayerId): number {
  return layerTopUm(id) - sliceLayer(id).drawnUm;
}

export function drawnDepthFromWaferTop(trueDepthUm: number): number {
  let remaining = Math.max(0, trueDepthUm);
  let drawn = 0;
  for (const id of WAFER_LAYERS) {
    const layer = sliceLayer(id);
    if (remaining <= layer.trueUm) return drawn + (remaining / layer.trueUm) * layer.drawnUm;
    remaining -= layer.trueUm;
    drawn += layer.drawnUm;
  }
  return drawn;
}

export function photonStopUm(wavelengthNm: number): number {
  const wafer = waferThicknessUm();
  const depth = clamp(absorptionDepthUm(wavelengthNm), 0, wafer);
  return layerTopUm('emitter') - drawnDepthFromWaferTop(depth);
}

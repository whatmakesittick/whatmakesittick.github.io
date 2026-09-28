import { clamp } from '@core/math';
import type { FluidId, LayerId } from '../../ids';
import { BLOCK_BOTTOM_DEPTH_M, LAYERS, RESERVOIR_FLUIDS } from '../../model/wellPlan';
import { ANTICLINE } from '../constants';
import { slotHalfWidth } from './wellColumn';

export type BandId = Exclude<LayerId, 'reservoir'> | FluidId;

export interface Band {
  id: BandId;
  top(x: number): number;
  bottom(x: number): number;
}

const RESERVOIR: LayerId = 'reservoir';

const ARCH_SHARE: Partial<Record<LayerId, number>> = {
  seal: 1,
  reservoir: 1,
  base: 1,
  sourceRock: ANTICLINE.sourceShare,
};

const FLAT_HALF_WIDTH = slotHalfWidth();

export function archDrop(x: number): number {
  const beyond = Math.max(0, Math.abs(x) - FLAT_HALF_WIDTH);
  return ANTICLINE.amplitudeM * (1 - Math.exp(-(beyond * beyond) / (2 * ANTICLINE.width ** 2)));
}

function layerTop(index: number, x: number): number {
  if (index >= LAYERS.length) return BLOCK_BOTTOM_DEPTH_M;
  const layer = LAYERS[index];
  return layer.top + (ARCH_SHARE[layer.id] ?? 0) * archDrop(x);
}

function reservoirIndex(): number {
  return LAYERS.findIndex((layer) => layer.id === RESERVOIR);
}

function fluidBands(): Band[] {
  const index = reservoirIndex();
  const top = (x: number) => layerTop(index, x);
  const bottom = (x: number) => layerTop(index + 1, x);
  return RESERVOIR_FLUIDS.map((leg, legIndex): Band => {
    const first = legIndex === 0;
    const last = legIndex === RESERVOIR_FLUIDS.length - 1;
    return {
      id: leg.id,
      top: (x) => (first ? top(x) : clamp(leg.top, top(x), bottom(x))),
      bottom: (x) => (last ? bottom(x) : clamp(leg.bottom, top(x), bottom(x))),
    };
  });
}

export function bands(): Band[] {
  return LAYERS.flatMap((layer, index): Band[] => {
    if (layer.id === RESERVOIR) return fluidBands();
    return [
      {
        id: layer.id as BandId,
        top: (x) => layerTop(index, x),
        bottom: (x) => layerTop(index + 1, x),
      },
    ];
  });
}

export function contactReach(contactDepth: number, limit: number, step: number): number {
  const top = (x: number) => layerTop(reservoirIndex(), x);
  let x = 0;
  while (x < limit && top(x) < contactDepth) x += step;
  return x;
}

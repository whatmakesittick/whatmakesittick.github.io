import type { Extent, RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../../../ids';
import { keyX, regionSpecFor, stringPath } from '../../../model';
import type { RegionOptions } from '../../../model';

const ACTION_HALF_DEPTH = 0.012;
const ACTION_CLOSE = { bottom: 0.693, overString: 0.033, z: [-0.465, -0.15] } as const;
const ESCAPEMENT_CLOSE = { bottom: 0.745, overString: 0.015, z: [-0.435, -0.25] } as const;
const INSET_FOOTROOM = 0.008;

function playedAction(key: number): Extent {
  const centre = keyX(key);
  return [centre - ACTION_HALF_DEPTH, centre + ACTION_HALF_DEPTH];
}

function stringY(key: number): number {
  return stringPath(key).strike[1];
}

function actionRegion(key: number, options: RegionOptions): RegionSpec {
  if (!options.ghost) {
    const top = stringY(key) + ACTION_CLOSE.overString;
    return { x: playedAction(key), y: [ACTION_CLOSE.bottom, top], z: ACTION_CLOSE.z };
  }
  const { y, z } = regionSpecFor('action', key, options);
  return { x: playedAction(key), y, z };
}

function escapementRegion(key: number, { inset }: RegionOptions): RegionSpec {
  const top = stringY(key) + ESCAPEMENT_CLOSE.overString;
  return {
    x: playedAction(key),
    y: [inset ? ESCAPEMENT_CLOSE.bottom - INSET_FOOTROOM : ESCAPEMENT_CLOSE.bottom, top],
    z: ESCAPEMENT_CLOSE.z,
  };
}

const CLOSE_UP_REGIONS = ['action', 'escapement'] as const satisfies readonly RegionId[];

export type CloseUpRegionId = (typeof CLOSE_UP_REGIONS)[number];

export function isCloseUpRegion(id: RegionId): id is CloseUpRegionId {
  return (CLOSE_UP_REGIONS as readonly RegionId[]).includes(id);
}

export function closeUpRegion(
  id: CloseUpRegionId,
  key: number,
  options: RegionOptions,
): RegionSpec {
  return id === 'action' ? actionRegion(key, options) : escapementRegion(key, options);
}

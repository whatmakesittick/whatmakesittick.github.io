import type { Extent, RegionSpec } from '@core/scene/regions';
import type { Point, RegionId } from '../../../ids';
import { INSET, PLATE, keyX, regionSpecFor, stringPath } from '../../../model';
import type { RegionOptions } from '../../../model';
import { labelPoint, panelCentre } from '../inset/window';

const STRING_ROOM = 0.06;
const LABEL_ROOM = 0.065;
const ACTION_HALF_DEPTH = 0.02;
const HEADROOM = 0.06;
const FOOTROOM = 0.04;

function reaching([min, max]: Extent, value: number): Extent {
  return [Math.min(min, value), Math.max(max, value)];
}

function covering(spec: RegionSpec, [x, y, z]: Point): RegionSpec {
  return { x: reaching(spec.x, x), y: reaching(spec.y, y), z: reaching(spec.z, z) };
}

function stringLabelRoom(key: number): Point {
  const { front, back } = stringPath(key);
  return [(front[0] + back[0]) / 2, front[1], (front[2] + back[2]) / 2 - STRING_ROOM];
}

function playedAction(key: number): Extent {
  const centre = keyX(key);
  return [centre - ACTION_HALF_DEPTH, centre + ACTION_HALF_DEPTH];
}

function actionRegion(key: number, options: RegionOptions): RegionSpec {
  const { y, z } = regionSpecFor('action', key, options);
  const raised: RegionSpec = {
    x: playedAction(key),
    y: [y[0] - FOOTROOM, Math.max(y[1], PLATE.topY + HEADROOM)],
    z,
  };
  return covering(raised, stringLabelRoom(key));
}

function escapementRegion(key: number, options: RegionOptions): RegionSpec {
  const model = regionSpecFor('escapement', key, { ...options, inset: false });
  const plain: RegionSpec = { ...model, x: playedAction(key) };
  if (!options.inset) return plain;
  const centre = panelCentre(key);
  const [x, y, z] = centre;
  const [labelX, labelY, labelZ] = labelPoint(centre);
  const corners: readonly Point[] = [
    [x, y - INSET.height / 2, z - INSET.width / 2],
    [x, y + INSET.height / 2, z + INSET.width / 2],
    [labelX, labelY + LABEL_ROOM, labelZ],
  ];
  return corners.reduce(covering, plain);
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

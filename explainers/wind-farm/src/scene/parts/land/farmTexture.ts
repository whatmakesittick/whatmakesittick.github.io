import { FARM_TERRAIN } from '../../../model/layout';
import { FARM_GROUND, GROUND_TEXTURE } from './constants';
import { GROUND_PAINT } from './fieldConstants';
import type { FieldLayout } from './fieldPlan';
import { paintFeatures } from './featurePainter';
import { paintFields } from './fieldPainter';
import type { Painter } from './groundCanvas';
import { fadeBoxEdges, paintMottle } from './groundOverlays';
import { boxProjection } from './projection';
import type { Projection } from './projection';

export function farmProjection(): Projection {
  const { size, farm } = GROUND_TEXTURE;
  return boxProjection(FARM_TERRAIN, size, farm.softness, farm.step);
}

export function paintFarmGround(painter: Painter, layout: FieldLayout): void {
  paintFields(painter, layout);
  paintFeatures(painter, layout);
  paintMottle(painter);
  fadeBoxEdges(painter, FARM_TERRAIN, FARM_GROUND.hazeFade, GROUND_PAINT.distance);
}

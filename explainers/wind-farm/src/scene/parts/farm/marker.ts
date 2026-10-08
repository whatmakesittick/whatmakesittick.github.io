import type { SpacingD } from '../../../ids';
import { COLUMN_COUNT, HERO_SITE, farmLayout } from '../../../model';
import type { GroundPoint } from '../../../model';
import type { PartContext } from '../context';
import { MARKER, MARKER_FINISH } from './constants';
import { midpoint, onGround } from './ground';
import { ribbons, SpacingLayer } from './layer';
import type { LayerShape } from './layer';

function tick([x, z]: GroundPoint): GroundPoint[] {
  return [
    [x, z - MARKER.tickLength / 2],
    [x, z + MARKER.tickLength / 2],
  ];
}

export function markerEnds(spacing: SpacingD): readonly [GroundPoint, GroundPoint] {
  const sites = farmLayout(spacing);
  const hero = sites[HERO_SITE];
  const next = sites[HERO_SITE + COLUMN_COUNT];
  return [
    [hero.x, hero.z],
    [next.x, hero.z],
  ];
}

function markerShape(spacing: SpacingD): LayerShape {
  const [start, end] = markerEnds(spacing);
  const options = { width: MARKER.width, lift: MARKER.lift, period: MARKER.width };
  const geometry = ribbons([{ routes: [[start, end], tick(start), tick(end)], options }]);
  return { geometry, label: onGround(midpoint(start, end), MARKER.labelLift) };
}

export function spacingMarker(context: PartContext): SpacingLayer {
  const material = context.materials.get('spacingMarker', MARKER_FINISH);
  return new SpacingLayer(context, 'spacingMarker', material, markerShape);
}

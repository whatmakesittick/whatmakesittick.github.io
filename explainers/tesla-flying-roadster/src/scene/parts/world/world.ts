import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { SITE_ANCHORS } from '../../../model/layout';
import type { PartId, SiteAnchorId } from '../../../ids';
import { concreteMaps } from '../../geometry/site/concrete';
import { trussPlan } from '../../geometry/site/rampTruss';
import type { PartContext } from '../context';
import type { WorldView } from '../types';
import { createGround } from './ground';
import { createGroundworks } from './groundworks';
import { createRamp } from './ramp';
import { createRunway } from './runway';
import { createSky } from './sky';

function siteAnchors(parent: Object3D): Record<SiteAnchorId, Object3D> {
  return {
    rampExit: anchorAt(parent, ...SITE_ANCHORS.rampExit),
    pad: anchorAt(parent, ...SITE_ANCHORS.pad),
    row: anchorAt(parent, ...SITE_ANCHORS.row),
  };
}

export function createWorld(context: PartContext): WorldView {
  const object = new Group();
  object.name = 'world';
  const plan = trussPlan();
  const concrete = concreteMaps();
  context.tracker.track(concrete.map);
  context.tracker.track(concrete.normal);
  const runway = createRunway(context, concrete);
  const ramp = createRamp(context, plan);
  object.add(
    createSky(context),
    createGround(context),
    runway.object,
    ramp.object,
    createGroundworks(context, concrete, plan),
  );
  const labels = new Map<PartId, Object3D>([
    ['runway', runway.runwayLabel],
    ['ramp', ramp.label],
    ['landingPad', runway.padLabel],
  ]);
  return { object, labels, anchors: siteAnchors(object) };
}

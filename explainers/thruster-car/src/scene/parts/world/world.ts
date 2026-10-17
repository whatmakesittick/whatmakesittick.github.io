import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { SITE_ANCHORS } from '../../../model/layout';
import type { PartId, SiteAnchorId } from '../../../ids';
import { concreteMaps } from '../../geometry/site/concrete';
import { groundLevel, rampPit } from '../../geometry/site/pit';
import { supportPlan } from '../../geometry/site/rampSupports';
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
  };
}

export function createWorld(context: PartContext): WorldView {
  const object = new Group();
  object.name = 'world';
  const pit = rampPit();
  const plan = supportPlan(groundLevel(pit));
  const concrete = concreteMaps();
  context.tracker.track(concrete.map);
  context.tracker.track(concrete.normal);
  const runway = createRunway(context, concrete, pit);
  const ramp = createRamp(context, plan);
  object.add(
    createSky(context),
    createGround(context),
    runway.object,
    ramp.object,
    createGroundworks(context, concrete, pit, plan),
  );
  const labels = new Map<PartId, Object3D>([
    ['runway', runway.runwayLabel],
    ['ramp', ramp.label],
    ['landingPad', runway.padLabel],
  ]);
  return { object, labels, anchors: siteAnchors(object) };
}

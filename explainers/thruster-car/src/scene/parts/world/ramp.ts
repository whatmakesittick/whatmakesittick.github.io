import { Group } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { deckMaps } from '../../geometry/site/deckPlate';
import {
  deckBodyGeometry,
  deckSweep,
  deckTopGeometry,
  railsGeometry,
} from '../../geometry/site/rampDeck';
import { rampSurfacePoint } from '../../geometry/site/rampFrame';
import type { SupportPlan } from '../../geometry/site/rampSupports';
import { supportsGeometry } from '../../geometry/site/rampSupports';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { WORLD_FINISHES, deckFinish } from './finishes';

export interface RampPart {
  object: Group;
  label: Object3D;
}

const LABEL = { u: 0.5, lift: 0.05 } as const;

export function createRamp(context: PartContext, plan: SupportPlan): RampPart {
  const object = new Group();
  object.name = 'ramp';
  const maps = deckMaps();
  context.tracker.track(maps.map);
  context.tracker.track(maps.normal);
  const sweep = deckSweep();
  object.add(
    partMesh(context, deckTopGeometry(sweep), 'ramp', deckFinish(maps.map, maps.normal)),
    partMesh(context, deckBodyGeometry(sweep), 'ramp', WORLD_FINISHES.deckUnderside),
    partMesh(context, railsGeometry(sweep), 'ramp', WORLD_FINISHES.rails),
    partMesh(context, supportsGeometry(plan), STRUCTURE_GROUP, WORLD_FINISHES.supports),
  );
  const label = rampSurfacePoint(LABEL.u, 0, LABEL.lift);
  return { object, label: anchorAt(object, label.x, label.y, label.z) };
}

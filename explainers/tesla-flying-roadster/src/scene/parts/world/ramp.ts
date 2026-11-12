import { Group } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { LOOP_LENGTH } from '../../../model/layout';
import { anchorAt } from '@core/scene/parts';
import {
  deckBodyGeometry,
  deckSweep,
  deckTopGeometry,
  railsGeometry,
} from '../../geometry/site/rampDeck';
import { rampSurfacePoint } from '../../geometry/site/rampFrame';
import { trussGeometry } from '../../geometry/site/rampTruss';
import type { TrussPlan } from '../../geometry/site/rampTruss';
import { partMesh } from '../context';
import type { WorldContext } from '../context';
import { duskEnvironment } from '../../environment';
import { deckFinish, steelFinishes } from './finishes';

export interface RampPart {
  object: Group;
  label: Object3D;
}

const LABEL = { distance: LOOP_LENGTH / 2, lift: 0.05 } as const;

export function createRamp(context: WorldContext, plan: TrussPlan): RampPart {
  const object = new Group();
  object.name = 'ramp';
  const sweep = deckSweep();
  const env = duskEnvironment(context.tracker);
  const steel = steelFinishes(env);
  object.add(
    partMesh(
      context,
      deckTopGeometry(sweep),
      'ramp',
      deckFinish(context.site.deck, context.site.deckTread, env),
    ),
    partMesh(context, deckBodyGeometry(sweep), 'ramp', steel.deckUnderside),
    partMesh(context, railsGeometry(sweep), 'ramp', steel.rails),
    partMesh(context, trussGeometry(plan), STRUCTURE_GROUP, steel.supports),
  );
  const label = rampSurfacePoint(LABEL.distance, 0, LABEL.lift);
  return { object, label: anchorAt(object, label.x, label.y, label.z) };
}

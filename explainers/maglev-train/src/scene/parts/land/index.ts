import type { Steps } from '@core/scene/pacing';
import type { AssemblyState } from '../../../ids';
import { wrapOffset } from '../../pose';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { createCut, setCut } from '../line/cut';
import { GROUND } from './constants';
import { buildGhost } from './ghost';
import { groundMesh, groundPlan } from './ground';
import { buildScenery } from './scenery';
import { skyDome } from './sky';
import { buildSubstations } from './substation';
import { trainShadow } from './trainShadow';
import { buildAir } from './air';

export function* buildLand(context: PartContext): Steps<Section> {
  const root = namedGroup('land');
  const plan = groundPlan();
  const cut = createCut();
  const ground = namedGroup('groundStream', root);
  ground.add(groundMesh(context, plan, cut));
  yield;
  const scenery = buildScenery(context, plan);
  yield;
  const ghost = buildGhost(context);
  yield;
  const air = buildAir(context);
  yield;
  const substations = buildSubstations(context);
  root.add(
    skyDome(context),
    scenery.root,
    substations.root,
    trainShadow(context, cut),
    air.root,
    ghost.root,
  );
  return {
    root,
    setState(state: AssemblyState) {
      ground.position.x = wrapOffset(state.motion.distance, GROUND.period);
      setCut(cut, state.view.cutaway);
      scenery.slide(state.motion.distance);
      air.setState(state.motion);
      substations.setState(state.motion.distance);
      ghost.setState(state);
    },
  };
}

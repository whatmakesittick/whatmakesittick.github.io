import type { AssemblyState } from '../../../ids';
import { wrapOffset } from '../../pose';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { GROUND } from './constants';
import { buildGhost } from './ghost';
import { groundMesh, groundPlan } from './ground';
import { buildScenery } from './scenery';
import { skyDome } from './sky';
import { trainShadow } from './trainShadow';
import { buildAir } from './air';

export function buildLand(context: PartContext): Section {
  const root = namedGroup('land');
  const plan = groundPlan();
  const ground = namedGroup('groundStream', root);
  ground.add(groundMesh(context, plan));
  const scenery = buildScenery(context, plan);
  const ghost = buildGhost(context);
  const air = buildAir(context);
  root.add(skyDome(context), scenery.root, trainShadow(context), air.root, ghost.root);
  return {
    root,
    setState(state: AssemblyState) {
      ground.position.x = wrapOffset(state.motion.distance, GROUND.period);
      scenery.slide(state.motion.distance);
      air.setState(state.motion);
      ghost.setState(state);
    },
  };
}

import type { AssemblyState } from '../../../ids';
import { wrapOffset } from '../../pose';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { GROUND } from './constants';
import { buildGhost } from './ghost';
import { groundPlane } from './ground';
import { skyDome } from './sky';

export function buildLand(context: PartContext): Section {
  const root = namedGroup('land');
  const streaming = namedGroup('landStream', root);
  streaming.add(groundPlane(context));
  const ghost = buildGhost(context);
  root.add(skyDome(context), ghost.root);
  return {
    root,
    setState(state: AssemblyState) {
      streaming.position.x = wrapOffset(state.motion.distance, GROUND.period);
      ghost.setState(state);
    },
  };
}

import type { AssemblyState, CompareId } from '../../../ids';
import { PLAYED_KEY, keyX, restAnchorPoint } from '../../../model';
import { STILL_SHARE } from '../../constants';
import { namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { buildHarpsichord } from './harpsichord';
import { buildLeaders } from './leaders';
import { keyCentred } from './shapes';
import { buildUpright } from './upright';

const REFERENCE_KEY = PLAYED_KEY.middle;

export function chosenMechanism({ view, compare }: AssemblyState): CompareId {
  return view.lineUp ? compare : 'grand';
}

export function isRinging(state: AssemblyState): boolean {
  return state.view.lineUp && state.harpsichord.stringShare > STILL_SHARE;
}

export function createGhosts(context: PartContext): Section {
  const root = namedGroup('ghosts');
  const upright = buildUpright(context);
  const harpsichord = buildHarpsichord(context);
  const leaders = buildLeaders(context);
  root.add(upright.root, harpsichord.root, leaders);
  sceneAnchor(
    context,
    'lineUp',
    root,
    keyCentred(restAnchorPoint('lineUp', REFERENCE_KEY), REFERENCE_KEY),
  );
  let elapsed = 0;

  return {
    root,
    setState(state) {
      const { ghost, lineUp } = state.view;
      root.position.x = keyX(PLAYED_KEY[state.register]);
      upright.root.visible = ghost || lineUp;
      harpsichord.root.visible = lineUp;
      leaders.visible = lineUp;
      upright.pose(state.upright);
      harpsichord.pose(state.harpsichord, elapsed);
      const chosen = chosenMechanism(state);
      upright.choose(chosen);
      harpsichord.choose(chosen);
    },
    animate(frame, state) {
      if (!isRinging(state)) return false;
      elapsed = frame.elapsed;
      harpsichord.pose(state.harpsichord, elapsed);
      return true;
    },
    warmUp(compile) {
      compile(upright.root);
      compile(harpsichord.root);
      compile(leaders);
    },
  };
}

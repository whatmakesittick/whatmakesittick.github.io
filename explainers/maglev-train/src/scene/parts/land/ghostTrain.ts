import { BoxGeometry } from 'three';
import type { AssemblyState } from '../../../ids';
import { GHOST_TRACK_Z, TRAIN } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { lineX } from '../../pose';
import { label, namedGroup, partMesh } from '../context';
import type { PartContext, Section } from '../context';

const GHOST_HEIGHT = 3.9;
const GHOST_WIDTH = 3.4;
const GHOST_FLOOR = 1.0;

function isInWindow(x: number): boolean {
  const half = TRAIN.length / 2;
  return x + half > -LINE_DRAW.behind && x - half < LINE_DRAW.ahead;
}

export function buildGhostTrain(context: PartContext): Section {
  const root = namedGroup('ghostTrain');
  const body = new BoxGeometry(TRAIN.length, GHOST_HEIGHT, GHOST_WIDTH);
  body.translate(0, GHOST_FLOOR + GHOST_HEIGHT / 2, 0);
  root.add(partMesh(context, body, 'ghostTrain'));
  root.position.z = -GHOST_TRACK_Z;
  label(context, 'ghostTrain', root, [0, GHOST_FLOOR + GHOST_HEIGHT, 0]);
  return {
    root,
    setState(state: AssemblyState) {
      const x = lineX(state.ghost.distance, state.motion.distance);
      root.position.x = x;
      root.visible = state.view.ghost && isInWindow(x);
    },
  };
}

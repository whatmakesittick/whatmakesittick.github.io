import type { Object3D } from 'three';
import type { Point } from '../../../ids';
import { PLAYED_KEY, SOUNDBOARD, stringPath } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { BOARD_MODE } from './boardPlan';
import { createBridges } from './bridges';
import { unisonOf } from './layout';
import type { PianoString } from './layout';
import { breathPatch } from './patches';
import { createSoundboard } from './soundboard';

const SOUNDBOARD_LABEL_Z = -0.65;
const BREAK_KEY = 32;

function xAt(string: PianoString, z: number): number {
  const [x, , frontZ] = string.front;
  const [dx, , dz] = string.direction;
  return x + (dx * (z - frontZ)) / dz;
}

function soundboardSpot(): Point {
  const below = unisonOf(BREAK_KEY);
  const above = unisonOf(BREAK_KEY + 1)[0];
  const x = (xAt(below[below.length - 1], SOUNDBOARD_LABEL_Z) + xAt(above, SOUNDBOARD_LABEL_Z)) / 2;
  return [x, SOUNDBOARD.topY, SOUNDBOARD_LABEL_Z];
}

function place(anchor: Object3D, [x, y, z]: Point): void {
  anchor.position.set(x, y, z);
}

export function createInterior(context: PartContext): Section {
  const root = namedGroup('interior');
  const breath = breathPatch({ uBreath: { value: 0 }, uBoardMode: { value: BOARD_MODE } });
  const soundboard = createSoundboard(context, breath);
  const structure = namedGroup('structure', root);
  structure.add(soundboard.rail);
  const bridges = createBridges(context, breath);
  root.add(soundboard.group, bridges);

  label(context, 'soundboard', soundboard.group, soundboardSpot());
  const bridgeAnchor = sceneAnchor(context, 'bridge', bridges, [0, 0, 0]);
  context.labels.set('bridge', bridgeAnchor);

  return {
    root,
    setState(state) {
      place(bridgeAnchor, stringPath(PLAYED_KEY[state.register]).back);
    },
  };
}

import type { Object3D } from 'three';
import type { Point, RegisterId } from '../../../ids';
import { PLATE, PLAYED_KEY, SOUNDBOARD, stringPath } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { BOARD_MODE } from './boardPlan';
import { createBridges } from './bridges';
import { TUNING_PIN } from './constants';
import { midSpeaking, PIANO_STRINGS, unisonOf } from './layout';
import type { PianoString } from './layout';
import { breathPatch, shimmerPatch, wavePatch } from './patches';
import { createPlate } from './plate';
import { createPlayedStrings } from './played';
import { createTuningPins, pinblockMesh } from './pins';
import { createSoundboard } from './soundboard';
import { createStringSets } from './strings';

const LABEL_KEYS = { stringSet: 56, bassStrings: 8 } as const;
const PLATE_LABEL: Point = [0.45, PLATE.topY, -0.108];
const SOUNDBOARD_LABEL_Z = -0.65;
const TUNING_PIN_LABEL_ORDER = 170;
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

function middleOf(key: number): PianoString {
  const unison = unisonOf(key);
  return unison[Math.floor(unison.length / 2)];
}

function place(anchor: Object3D, [x, y, z]: Point): void {
  anchor.position.set(x, y, z);
}

export function createInterior(context: PartContext): Section {
  const root = namedGroup('interior');
  const breath = breathPatch({ uBreath: { value: 0 }, uBoardMode: { value: BOARD_MODE } });
  const shimmer = shimmerPatch({ uShimmer: { value: 0 }, uShimmerPhase: { value: 0 } });
  const wave = wavePatch({ uWaveAmp: { value: [0, 0, 0] }, uWavePhase: { value: 0 } });
  const soundboard = createSoundboard(context, breath);
  const structure = namedGroup('structure', root);
  structure.add(soundboard.rail, pinblockMesh(context));
  const bridges = createBridges(context, breath);
  const plate = createPlate(context);
  const pins = createTuningPins(context);
  const sets = createStringSets(context, shimmer);
  const played = createPlayedStrings(context, wave);
  root.add(soundboard.group, bridges, plate, pins, sets.bass, sets.steel, played.group);

  const pinTop = PIANO_STRINGS[TUNING_PIN_LABEL_ORDER].pin;
  label(context, 'soundboard', soundboard.group, soundboardSpot());
  label(context, 'plate', plate, PLATE_LABEL);
  label(context, 'tuningPins', pins, [pinTop[0], TUNING_PIN.top, pinTop[2]]);
  label(context, 'stringSet', sets.steel, midSpeaking(middleOf(LABEL_KEYS.stringSet)));
  label(context, 'bassStrings', sets.bass, midSpeaking(middleOf(LABEL_KEYS.bassStrings)));
  const stringsAnchor = label(context, 'strings', played.group, [0, 0, 0]);
  const bridgeAnchor = sceneAnchor(context, 'bridge', bridges, [0, 0, 0]);
  context.labels.set('bridge', bridgeAnchor);

  let register: RegisterId | null = null;
  const hidePlayed = (key: number, hidden: boolean) =>
    sets.bands.forEach((band) => band.setHidden(unisonOf(key), hidden));
  const choose = (next: RegisterId) => {
    if (register) hidePlayed(PLAYED_KEY[register], false);
    register = next;
    const key = PLAYED_KEY[next];
    hidePlayed(key, true);
    played.show(next);
    place(stringsAnchor, midSpeaking(middleOf(key)));
    place(bridgeAnchor, stringPath(key).back);
  };

  return {
    root,
    setState(state) {
      if (state.register !== register) choose(state.register);
    },
  };
}

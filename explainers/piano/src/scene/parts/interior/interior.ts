import type { Object3D } from 'three';
import type { Point, RegisterId } from '../../../ids';
import { PLATE, PLAYED_KEY, SOUNDBOARD, stringPath } from '../../../model';
import { LOD_DISTANCE } from '../../constants';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { createBridges } from './bridges';
import { createCaps } from './caps';
import { TUNING_PIN } from './constants';
import { midSpeaking, PIANO_STRINGS, unisonOf } from './layout';
import type { PianoString } from './layout';
import { createPlate } from './plate';
import { createPlayedStrings } from './played';
import { createTuningPins, pinblockMesh } from './pins';
import { createSoundboard } from './soundboard';
import { createStringSets } from './strings';
import { createWave } from './wave';

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
  const wave = createWave();
  const soundboard = createSoundboard(context, wave.breath);
  const structure = namedGroup('structure', root);
  structure.add(soundboard.rail, pinblockMesh(context));
  const bridges = createBridges(context, wave.breath);
  const plate = createPlate(context);
  const pins = createTuningPins(context);
  const sets = createStringSets(context, wave.shimmer);
  const played = createPlayedStrings(context, wave.wave);
  const caps = createCaps(context, wave.breath);
  root.add(soundboard.group, bridges, plate, pins, sets.bass, sets.steel, played.group, caps.root);

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
      caps.show(state.register, state.view.cutaway, context.cut.x.value);
      wave.setState(state);
    },
    animate(frame, state) {
      caps.show(state.register, state.view.cutaway, context.cut.x.value);
      const thin = frame.cameraDistance > LOD_DISTANCE.thinStrings;
      sets.bands.forEach((band) => band.setThin(thin));
      return wave.animate(frame, state);
    },
    warmUp(compile) {
      caps.prepareAll();
      const hidden = [caps.root, ...caps.root.children, ...Object.values(played.meshes)].filter(
        (object) => !object.visible,
      );
      hidden.forEach((object) => (object.visible = true));
      compile(root);
      hidden.forEach((object) => (object.visible = false));
    },
  };
}

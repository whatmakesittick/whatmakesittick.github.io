import type { Object3D } from 'three';
import type { CameraView, Point, RegisterId } from '../../../ids';
import { PLAYED_KEY, stringPath } from '../../../model';
import { LOD_DISTANCE } from '../../constants';
import { hidingMask, railCapMask, stringStubBox, stubMask } from '../closeKeep';
import { CloseLook, isCloseView } from '../closeLook';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { createBridges } from './bridges';
import { createCaps } from './caps';
import {
  bassSpot,
  plateSpot,
  soundboardSpot,
  stringSpot,
  strikeSpot,
  tuningPinSpot,
} from './labelSpots';
import { unisonOf } from './layout';
import { createPlate } from './plate';
import { createPlayedStrings } from './played';
import { createTuningPins, pinblockMesh } from './pins';
import { createSoundboard } from './soundboard';
import { createStringSets } from './strings';
import { createWave } from './wave';

const STRING_SET_LABEL_KEY = 56;

function place(anchor: Object3D, [x, y, z]: Point): void {
  anchor.position.set(x, y, z);
}

export function createInterior(context: PartContext): Section {
  const root = namedGroup('interior');
  const wave = createWave();
  const soundboard = createSoundboard(context, wave.breath, wave.board);
  const structure = namedGroup('structure', root);
  structure.add(soundboard.rail, pinblockMesh(context));
  const bridges = createBridges(context, wave.breath);
  const plate = createPlate(context);
  const pins = createTuningPins(context);
  const sets = createStringSets(context, wave.shimmer);
  const played = createPlayedStrings(context, wave.wave, wave.blur);
  const caps = createCaps(context, wave);
  root.add(soundboard.group, bridges, plate, pins, sets.bass, sets.steel, played.group, caps.root);

  const origin: Point = [0, 0, 0];
  label(context, 'stringSet', sets.steel, stringSpot(STRING_SET_LABEL_KEY));
  const anchors = {
    soundboard: label(context, 'soundboard', soundboard.group, origin),
    plate: label(context, 'plate', plate, origin),
    tuningPins: label(context, 'tuningPins', pins, origin),
    bassStrings: label(context, 'bassStrings', sets.bass, origin),
    strings: label(context, 'strings', played.group, origin),
  };
  const bridgeAnchor = sceneAnchor(context, 'bridge', bridges, origin);
  context.labels.set('bridge', bridgeAnchor);

  const look = new CloseLook();
  const stub = stubMask(look.amount);
  const capMask = railCapMask(look.amount);
  stub.cover(played.group);
  capMask.cover(caps.root);
  hidingMask(look.amount).cover(root);

  let register: RegisterId | null = null;
  let close = false;
  const placeStrings = (key: number) =>
    place(anchors.strings, close ? strikeSpot(key) : stringSpot(key));
  const hidePlayed = (key: number, hidden: boolean) =>
    sets.bands.forEach((band) => band.setHidden(unisonOf(key), hidden));
  const choose = (next: RegisterId) => {
    if (register) hidePlayed(PLAYED_KEY[register], false);
    register = next;
    const key = PLAYED_KEY[next];
    hidePlayed(key, true);
    stub.keep(stringStubBox(key));
    placeStrings(key);
    place(anchors.soundboard, soundboardSpot(key));
    place(anchors.plate, plateSpot(key));
    place(anchors.tuningPins, tuningPinSpot(key));
    place(bridgeAnchor, stringPath(key).back);
    const bass = bassSpot(key);
    anchors.bassStrings.visible = bass !== null;
    if (bass) place(anchors.bassStrings, bass);
  };

  return {
    root,
    setState(state) {
      if (state.register !== register) choose(state.register);
      played.show(state.register, state.view.wave);
      caps.show(state.register, state.view.cutaway, context.cut.x.value);
      capMask.cover(caps.root);
      wave.setState(state);
    },
    animate(frame, state) {
      caps.show(state.register, state.view.cutaway, context.cut.x.value);
      const thin = frame.cameraDistance > LOD_DISTANCE.thinStrings;
      sets.bands.forEach((band) => band.setThin(thin));
      const looking = look.step(frame.delta, frame.cameraDistance);
      return wave.animate(frame, state) || looking;
    },
    focus(view: CameraView) {
      look.focus(view);
      close = isCloseView(view);
      if (register) placeStrings(PLAYED_KEY[register]);
    },
    warmUp(compile) {
      caps.prepareAll();
      const hidden = [caps.root, ...caps.root.children, ...played.group.children].filter(
        (object) => !object.visible,
      );
      hidden.forEach((object) => (object.visible = true));
      compile(root);
      hidden.forEach((object) => (object.visible = false));
    },
  };
}

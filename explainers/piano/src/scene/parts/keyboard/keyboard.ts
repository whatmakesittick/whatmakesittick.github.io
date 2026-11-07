import { BoxGeometry, CylinderGeometry } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { AssemblyState } from '../../../ids';
import { KEY, PLAYED_KEY, cutX, keyX, mm } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, partMesh } from '../context';
import type { PartContext, Section } from '../context';
import { sectionCap } from './caps';
import {
  boxBetween,
  boxMatrix,
  mergeParts,
  outlineShape,
  placedMatrix,
  planSlab,
  profileAlongX,
} from './geometry';
import { KeyedInstances } from './instances';
import {
  ALL_KEYS,
  BACK_CLOTH_RECT,
  FRAME_RAIL_RECTS,
  KEY_PLAN,
  NOTCHES,
  blackKeys,
  blackProfile,
  keybedBounds,
  keybedRect,
  keyboardLabelKey,
  punchings,
  railBounds,
  stickBounds,
  whiteKeysWith,
  whiteOutline,
} from './layout';
import { LazyEase } from './lazyEase';

const FRAME_WOOD: MaterialFinish = { color: '#5c4330', roughness: 0.75 };
const WHITE_BEVEL = 0.0008;
const BLACK_BEVEL = 0.0012;
const PUNCHING_SEGMENTS = 10;
const LABEL_SET_BACK = 0.02;

function addWhiteKeys(rows: KeyedInstances): void {
  NOTCHES.forEach((notch) => {
    const keys = whiteKeysWith(notch);
    if (keys.length === 0) return;
    rows.add({
      geometry: planSlab(outlineShape(whiteOutline(notch)), KEY_PLAN.bottom, KEY.top, WHITE_BEVEL),
      group: 'keyboard',
      finish: FINISHES.ivory,
      entries: keys.map((key) => [key, placedMatrix([keyX(key), 0, 0])]),
    });
  });
}

function addBlackKeys(rows: KeyedInstances): void {
  const half = KEY.blackWidth / 2;
  rows.add({
    geometry: profileAlongX(outlineShape(blackProfile()), -half, half, BLACK_BEVEL),
    group: 'keyboard',
    finish: FINISHES.ebony,
    entries: blackKeys().map((key) => [key, placedMatrix([keyX(key), 0, 0])]),
  });
}

function addSticks(rows: KeyedInstances): void {
  rows.add({
    geometry: new BoxGeometry(),
    group: 'keyboard',
    finish: FINISHES.keyWood,
    entries: ALL_KEYS.map((key) => [key, boxMatrix(stickBounds(key))]),
  });
}

function addPunchings(rows: KeyedInstances): void {
  const geometry = new CylinderGeometry(1, 1, 1, PUNCHING_SEGMENTS).translate(0, 0.5, 0);
  rows.add({
    geometry,
    group: 'keyboard',
    finish: FINISHES.cloth,
    entries: ALL_KEYS.flatMap(punchings).map(({ key, position, radius, height }) => [
      key,
      placedMatrix(position, [radius, height, radius]),
    ]),
  });
}

function keyFrame(context: PartContext): Object3D {
  const frame = namedGroup('keyFrame');
  const rails = mergeParts(FRAME_RAIL_RECTS.map((rect) => boxBetween(railBounds(rect))));
  frame.add(partMesh(context, rails, STRUCTURE_GROUP, FRAME_WOOD));
  frame.add(partMesh(context, boxBetween(railBounds(BACK_CLOTH_RECT)), 'keyboard', FINISHES.cloth));
  return frame;
}

export function createKeyboard(context: PartContext): Section {
  const root = namedGroup('keyboard');
  const shifted = namedGroup('keyboardShift', root);
  const rows = new KeyedInstances(context, shifted);
  addWhiteKeys(rows);
  addBlackKeys(rows);
  addSticks(rows);
  addPunchings(rows);
  shifted.add(keyFrame(context));
  root.add(partMesh(context, boxBetween(keybedBounds()), STRUCTURE_GROUP, FINISHES.darkWood));
  const cap = sectionCap(context, [keybedRect(), ...FRAME_RAIL_RECTS, BACK_CLOTH_RECT]);
  root.add(cap);
  const keyboardLabel = label(context, 'keyboard', shifted, [0, KEY.top, -LABEL_SET_BACK]);
  const shift = new LazyEase();
  let played = PLAYED_KEY.middle;

  function place(): void {
    const offset = mm(shift.value);
    shifted.position.x = offset;
    cap.position.x = cutX(played) + offset;
  }

  return {
    root,
    setState(state: AssemblyState): void {
      played = PLAYED_KEY[state.register];
      rows.hide(played);
      keyboardLabel.position.x = keyX(keyboardLabelKey(played));
      cap.visible = state.view.cutaway;
      shift.aim(state.action.shiftMm);
      place();
    },
    animate(frame): boolean {
      const moving = shift.step(frame.delta);
      if (moving) place();
      return moving;
    },
  };
}

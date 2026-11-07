import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { DAMPER_LIFT_MAX, KEYS, PLAYED_KEY, cutX, keyX, mm } from '../../../model';
import { LOD_DISTANCE } from '../../constants';
import { label, namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { sectionCap } from '../keyboard/caps';
import { LazyEase } from '../keyboard/lazyEase';
import { buildInstancedActions, buildInstancedDampers } from './instanced';
import { headSize } from './layout';
import {
  ACTION_RAILS,
  DAMPER_RAILS,
  buildActionRails,
  buildDamperRails,
  cutsDamperRails,
} from './rails';

const LABEL_NEIGHBOUR = 2;
const PEDAL_DOWN = 1;

function actionsLabelKey(played: number): number {
  return Math.min(played + LABEL_NEIGHBOUR, KEYS);
}

export function createAction(context: PartContext): Section {
  const root = namedGroup('action');
  const shifted = namedGroup('actionShift', root);
  const lifted = namedGroup('dampers', root);
  const actions = buildInstancedActions(context, shifted);
  const dampers = buildInstancedDampers(context, lifted);
  shifted.add(buildActionRails(context));
  root.add(buildDamperRails(context));
  const actionCap = sectionCap(context, ACTION_RAILS);
  const damperCap = sectionCap(context, DAMPER_RAILS);
  root.add(actionCap, damperCap);
  const actionsLabel = label(context, 'actions', shifted, [0, 0, 0]);
  const small: readonly Object3D[] = [...actions.small, ...dampers.small];
  const shift = new LazyEase();
  const pedal = new LazyEase();
  let played = PLAYED_KEY.middle;
  let cutaway = false;

  function place(): void {
    const offset = mm(shift.value);
    const cut = cutX(played) + offset;
    shifted.position.x = offset;
    lifted.position.y = pedal.value * DAMPER_LIFT_MAX;
    actionCap.position.x = cut;
    damperCap.position.x = cut;
    actionCap.visible = cutaway;
    damperCap.visible = cutaway && cutsDamperRails(cut);
  }

  function placeLabel(): void {
    const neighbour = actionsLabelKey(played);
    const head = headSize(neighbour);
    actionsLabel.position.set(keyX(neighbour), head.top, head.centreZ);
  }

  return {
    root,
    setState(state: AssemblyState): void {
      played = PLAYED_KEY[state.register];
      cutaway = state.view.cutaway;
      actions.rows.hide(played);
      dampers.rows.hide(played);
      placeLabel();
      shift.aim(state.action.shiftMm);
      pedal.aim(state.pedal === 'sustain' ? PEDAL_DOWN : 0);
      place();
    },
    animate(frame: Frame): boolean {
      const shifting = shift.step(frame.delta);
      const lifting = pedal.step(frame.delta);
      const near = frame.cameraDistance <= LOD_DISTANCE.smallParts;
      small.forEach((mesh) => (mesh.visible = near));
      if (shifting || lifting) place();
      return shifting || lifting;
    },
  };
}

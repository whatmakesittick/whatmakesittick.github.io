import type { Object3D } from 'three';
import type { ActionPose, AssemblyState } from '../../../ids';
import { DAMPER_LIFT_MAX, KEYS, PLAYED_KEY, cutX, keyX, mm } from '../../../model';
import { LOD_DISTANCE } from '../../constants';
import { playedX } from '../../pose';
import { neighbourBox, neighbourMask, railCapMask, railStubBox, railStubMask } from '../closeKeep';
import { CloseLook, isCloseView } from '../closeLook';
import { label, namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { sectionCap } from '../keyboard/caps';
import { LazyEase } from '../keyboard/lazyEase';
import { DetailedAction } from './detailed';
import { buildInstancedActions, buildInstancedDampers } from './instanced';
import { detailedPose, headSize } from './layout';
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
  const actionRails = buildActionRails(context);
  const damperRails = buildDamperRails(context);
  shifted.add(actionRails);
  root.add(damperRails);
  const actionCap = sectionCap(context, ACTION_RAILS, 'actionCap');
  const damperCap = sectionCap(context, DAMPER_RAILS, 'damperCap');
  root.add(actionCap, damperCap);
  const look = new CloseLook();
  const neighbours = neighbourMask(look.amount);
  const railStub = railStubMask(look.amount);
  const capMask = railCapMask(look.amount);
  [...actions.rows.meshes, ...dampers.rows.meshes].forEach((mesh) => neighbours.cover(mesh));
  [actionRails, damperRails].forEach((rails) => railStub.cover(rails));
  [actionCap, damperCap].forEach((cap) => capMask.cover(cap));
  const detailed = new DetailedAction(context);
  root.add(detailed.root, detailed.damper);
  const actionsLabel = label(context, 'actions', shifted, [0, 0, 0]);
  const small: readonly Object3D[] = [...actions.small, ...dampers.small];
  const shift = new LazyEase();
  const pedal = new LazyEase();
  let played = PLAYED_KEY.middle;
  let cutaway = false;
  let pose: ActionPose | null = null;

  function posePlayed(): void {
    if (pose) detailed.pose(detailedPose(pose, pedal.value));
  }

  function place(): void {
    const offset = mm(shift.value);
    const cut = cutX(played) + offset;
    shifted.position.x = offset;
    detailed.root.position.x = playedX(played, shift.value);
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
      neighbours.keep(neighbourBox(played));
      railStub.keep(railStubBox(played));
      placeLabel();
      shift.aim(state.action.shiftMm);
      pedal.aim(state.pedal === 'sustain' ? PEDAL_DOWN : 0);
      pose = state.action;
      detailed.setKey(played);
      posePlayed();
      place();
    },
    animate(frame: Frame): boolean {
      const shifting = shift.step(frame.delta);
      const lifting = pedal.step(frame.delta);
      const near = frame.cameraDistance <= LOD_DISTANCE.smallParts;
      small.forEach((mesh) => (mesh.visible = near));
      if (shifting || lifting) place();
      if (lifting) posePlayed();
      const looking = look.step(frame.delta, frame.cameraDistance);
      return shifting || lifting || looking;
    },
    focus(view): void {
      look.focus(view);
      detailed.focus(isCloseView(view));
    },
    warmUp(compile): void {
      compile(detailed.root);
      compile(detailed.damper);
    },
  };
}

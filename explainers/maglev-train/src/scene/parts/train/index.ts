import type { AssemblyState, MotionReading } from '../../../ids';
import { ANCHOR_POINTS } from '../../../model';
import { applyTrainPose } from '../../pose';
import { label, namedGroup, sceneAnchor } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { Ease } from '../ease';
import { RESTING_NUDGE } from '../nudge';
import { buildBody } from './body';
import { EDDY_GLOW } from './constants';
import { LABEL_POINTS } from './labels';
import { buildMagnets } from './magnets';
import { buildSkids } from './skids';
import { buildSkirt } from './skirt';
import { buildWindows } from './windows';

const SCENE_ANCHORS = ['nose', 'tail', 'arm', 'cut'] as const;

export function buildTrain(context: PartContext): Section {
  const root = namedGroup('trainRoot');
  const posed = namedGroup('train', root);
  const ahead = namedGroup('trainAhead', posed);
  buildBody(context, posed, ahead);
  const windows = buildWindows(context, posed);
  const skirt = buildSkirt(context, posed, ahead);
  const magnets = buildMagnets(context, posed);
  const skids = buildSkids(context, posed, ahead);
  const cutSets = [windows, skirt, magnets, skids];
  (Object.keys(LABEL_POINTS) as (keyof typeof LABEL_POINTS)[]).forEach((part) =>
    label(context, part, posed, LABEL_POINTS[part]),
  );
  SCENE_ANCHORS.forEach((id) => sceneAnchor(context, id, posed, ANCHOR_POINTS[id]));
  const glow = new Ease(0);
  let nudge = RESTING_NUDGE;
  let current: AssemblyState | null = null;
  const pose = (motion: MotionReading) =>
    applyTrainPose(posed, { liftMm: motion.liftMm - nudge.gapMm }, nudge.lateralMm);

  return {
    root,
    setState(state: AssemblyState) {
      current = state;
      pose(state.motion);
      const whole = !state.view.cutaway;
      ahead.visible = whole;
      cutSets.forEach((set) => set.showAhead(whole));
      skids.setSliding(state.motion.sliding);
      glow.aim(state.power.eddy ? 1 : 0);
    },
    animate(frame: Frame, state: AssemblyState) {
      const moved = frame.nudge !== nudge;
      nudge = frame.nudge;
      if (moved) pose((current ?? state).motion);
      glow.step(frame.delta);
      magnets.eddyMaterial.emissiveIntensity = glow.value * EDDY_GLOW.intensity;
      return glow.running;
    },
  };
}

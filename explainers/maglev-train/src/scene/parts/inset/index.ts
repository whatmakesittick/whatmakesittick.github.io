import type { Group } from 'three';
import type { AssemblyState } from '../../../ids';
import { INSET, INSET_CENTRE, REST_GAP_MM } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { NudgeSample, PartContext, Section } from '../context';
import { Ease } from '../ease';
import { RESTING_NUDGE } from '../nudge';
import { fieldBands } from './field';
import { gapGauge } from './gapGauge';
import { guidanceDetail } from './guidance';
import { magnetTop } from './layout';
import { buildLeader } from './leader';
import { magnetDrawing } from './magnet';
import { fieldLead, insetPace, patternOffset } from './pace';
import { buildPanel } from './panel';
import { buildStator } from './stator';
import { thrustArrow } from './thrust';
import type { Thrust } from './thrust';

const INSET_NAME = 'gapInset';
const FACING_MINUS_Z = Math.PI;

function thrustFor(state: AssemblyState): Thrust {
  if (!state.wave.on || state.motion.speedMs <= 0) return 'none';
  return state.wave.reversed ? 'backward' : 'forward';
}

function aimed(ease: Ease | null, target: number): Ease {
  if (!ease) return new Ease(target);
  ease.aim(target);
  return ease;
}

function facingPanel(): Group {
  const panel = namedGroup('gapInsetPanel');
  panel.position.set(...INSET_CENTRE);
  panel.rotation.y = FACING_MINUS_Z;
  return panel;
}

export function buildInset(context: PartContext): Section {
  const root = namedGroup(INSET_NAME);
  const panel = facingPanel();
  const field = fieldBands(context);
  const magnet = magnetDrawing(context);
  const gauge = gapGauge(context);
  const arrow = thrustArrow(context);
  const guidance = guidanceDetail(context);
  panel.add(...buildPanel(context));
  buildStator(context, panel);
  panel.add(field.group, magnet.group, gauge.group, arrow.group, guidance.group);
  label(context, 'gapInset', panel, [INSET.width / 2, INSET.height / 2, 0]);
  root.add(panel, ...buildLeader(context));
  sceneAnchor(context, 'inset', root, INSET_CENTRE);
  let speedMs = 0;
  let readingGapMm = REST_GAP_MM;
  let nudge: NudgeSample = RESTING_NUDGE;
  let lead: Ease | null = null;
  let strength: Ease | null = null;
  let shift = 0;
  let thrust: Thrust = 'none';

  const draw = () => {
    const gapMm = readingGapMm + nudge.gapMm;
    const top = magnetTop(gapMm);
    magnet.draw(top, patternOffset(shift));
    arrow.draw(top, thrust);
    gauge.draw(gapMm);
    guidance.draw(nudge.lateralMm);
    field.draw(patternOffset(shift + (lead?.value ?? 0)), strength?.value ?? 0);
  };

  return {
    root,
    setState(state) {
      root.visible = state.view.gap;
      readingGapMm = state.motion.gapMm;
      speedMs = state.motion.speedMs;
      lead = aimed(lead, fieldLead(state.wave.reversed));
      strength = aimed(strength, state.wave.on ? 1 : 0);
      thrust = thrustFor(state);
      draw();
    },
    animate(frame, state) {
      if (!state.view.gap) return false;
      shift += insetPace(speedMs) * frame.delta;
      lead?.step(frame.delta);
      strength?.step(frame.delta);
      nudge = frame.nudge;
      draw();
      return speedMs > 0 || nudge.active || Boolean(lead?.running || strength?.running);
    },
  };
}

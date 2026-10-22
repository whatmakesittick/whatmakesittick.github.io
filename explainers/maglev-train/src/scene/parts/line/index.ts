import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import {
  ARM_ANCHOR,
  BEAM_M,
  CUT_X,
  GIRDER,
  GUIDANCE_RAIL,
  GUIDEWAY_TOP,
  PIER,
  STATOR,
  STATOR_BOTTOM,
  TRAIN,
} from '../../../model';
import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { concreteLooks } from './concreteLook';
import { LINE_FINISHES, TRAY } from './constants';
import { createCut, setCut } from './cut';
import { buildCutCap } from './cutCap';
import { buildGuideway } from './guideway';
import { buildPowerFlow } from './powerFlow';
import { buildStations } from './stations';
import { buildWaveEffects } from './wave';

const LABEL_X = TRAIN.noseX + BEAM_M;
const WEB_Z = GIRDER.topWidth / 4;
const [ARM_X] = ARM_ANCHOR;
const CUT_LABEL_X = CUT_X - 2;

function lineLabels(context: PartContext, parent: Object3D): void {
  label(context, 'guideway', parent, [LABEL_X, (GIRDER.bottom + GUIDEWAY_TOP) / 2, WEB_Z]);
  label(context, 'guidanceRails', parent, [LABEL_X, GUIDANCE_RAIL.centreY, GUIDANCE_RAIL.faceZ]);
  label(context, 'feederCable', parent, [LABEL_X, TRAY.top, -TRAY.outer]);
  label(context, 'piers', parent, [LABEL_X, PIER.height / 2, 0]);
}

export function buildLine(context: PartContext): Section {
  const root = namedGroup('line');
  const cut = createCut();
  const concrete = concreteLooks(context);
  const wave = buildWaveEffects(context, cut);
  const guideway = buildGuideway(context, {
    concrete: concrete.finish,
    stator: wave.stator,
    cut,
  });
  const cap = buildCutCap(context, LINE_FINISHES.paintedSteel);
  const stations = buildStations(context, concrete.stations);
  const flow = buildPowerFlow(context, cut);
  const labelsAhead = namedGroup('lineLabels', root);
  root.add(guideway.group, cap, stations.group, wave.powered, wave.travelling, flow.group);
  lineLabels(context, labelsAhead);
  label(context, 'statorPacks', root, [ARM_X, STATOR_BOTTOM, -STATOR.sideZ]);
  return {
    root,
    setState(state: AssemblyState) {
      guideway.slide(state.motion.distance);
      stations.place(state.motion.distance);
      wave.setState(state);
      flow.setFlow(state.power.flow);
      setCut(cut, state.view.cutaway);
      cap.visible = state.view.cutaway;
      labelsAhead.position.x = state.view.cutaway ? CUT_LABEL_X - LABEL_X : 0;
    },
    animate(frame, state) {
      const drifting = wave.animate(frame, state);
      const streaming = flow.stream(frame.delta);
      return drifting || streaming;
    },
  };
}

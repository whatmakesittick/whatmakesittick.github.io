import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import {
  BEAM_M,
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
import { TRAY } from './constants';
import { buildGuideway } from './guideway';
import { buildPowerFlow } from './powerFlow';
import { buildStations } from './stations';
import { buildWaveEffects } from './wave';

const LABEL_X = TRAIN.noseX + BEAM_M;
const WEB_Z = GIRDER.topWidth / 4;

function lineLabels(context: PartContext, parent: Object3D): void {
  label(context, 'guideway', parent, [LABEL_X, (GIRDER.bottom + GUIDEWAY_TOP) / 2, WEB_Z]);
  label(context, 'statorPacks', parent, [LABEL_X, STATOR_BOTTOM, -STATOR.sideZ]);
  label(context, 'guidanceRails', parent, [LABEL_X, GUIDANCE_RAIL.centreY, GUIDANCE_RAIL.faceZ]);
  label(context, 'feederCable', parent, [LABEL_X, TRAY.top, -TRAY.outer]);
  label(context, 'piers', parent, [LABEL_X, PIER.height / 2, 0]);
}

export function buildLine(context: PartContext): Section {
  const root = namedGroup('line');
  const concrete = concreteLooks(context);
  const wave = buildWaveEffects(context);
  const guideway = buildGuideway(context, concrete.line, wave.stator);
  const stations = buildStations(context, concrete.stations);
  const flow = buildPowerFlow(context);
  root.add(guideway.group, stations.group, wave.powered, wave.travelling, flow.group);
  lineLabels(context, root);
  return {
    root,
    setState(state: AssemblyState) {
      guideway.slide(state.motion.distance);
      stations.place(state.motion.distance);
      wave.setState(state);
      flow.setFlow(state.power.flow);
    },
    animate(frame, state) {
      const drifting = wave.animate(frame, state);
      const streaming = flow.stream(frame.delta);
      return drifting || streaming;
    },
  };
}

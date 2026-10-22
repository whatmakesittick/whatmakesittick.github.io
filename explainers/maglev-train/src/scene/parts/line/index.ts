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
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial } from '../context';
import type { PartContext, Section } from '../context';
import { TRAY } from './constants';
import { buildGuideway } from './guideway';
import { buildStations } from './stations';
import { createMaterial } from '@core/scene/materials';

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
  const stator = registeredMaterial(context, 'statorPacks', createMaterial(FINISHES.stator));
  const guideway = buildGuideway(context, stator);
  const stations = buildStations(context);
  const wave = namedGroup('wave', root);
  const flow = namedGroup('powerFlow', root);
  root.add(guideway.group, stations.group);
  lineLabels(context, root);
  label(context, 'poweredSection', wave, [LABEL_X, STATOR_BOTTOM, -STATOR.sideZ]);
  label(context, 'travellingWave', wave, [TRAIN.noseX, STATOR_BOTTOM, STATOR.sideZ]);
  label(context, 'powerFlow', flow, [LABEL_X + BEAM_M, TRAY.bottom, TRAY.outer]);
  return {
    root,
    setState(state: AssemblyState) {
      const { distance } = state.motion;
      guideway.slide(distance);
      stations.place(distance);
      wave.visible = state.view.wave && state.wave.on;
      flow.visible = state.power.flow === 'drive' || state.power.flow === 'regen';
    },
  };
}

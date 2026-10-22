import type { AssemblyState } from '../../../ids';
import {
  BEAM_M,
  GIRDER,
  GUIDANCE_RAIL,
  GUIDEWAY_TOP,
  PIER,
  STATIONS,
  STATOR,
  STATOR_BOTTOM,
  TRAIN,
} from '../../../model';
import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';

const LABEL_X = TRAIN.noseX + BEAM_M;
const WEB_Z = GIRDER.topWidth / 4;
const PLATFORM_Z = TRAIN.width;

export function buildLine(context: PartContext): Section {
  const root = namedGroup('line');
  const wave = namedGroup('wave', root);
  label(context, 'guideway', root, [LABEL_X, (GIRDER.bottom + GUIDEWAY_TOP) / 2, WEB_Z]);
  label(context, 'statorPacks', root, [LABEL_X, STATOR_BOTTOM, -STATOR.sideZ]);
  label(context, 'guidanceRails', root, [LABEL_X, GUIDANCE_RAIL.centreY, GUIDANCE_RAIL.faceZ]);
  label(context, 'feederCable', root, [LABEL_X, STATOR_BOTTOM, -WEB_Z]);
  label(context, 'piers', root, [LABEL_X, PIER.height / 2, 0]);
  label(context, 'stations', root, [0, STATIONS.platformFloor, PLATFORM_Z]);
  label(context, 'powerFlow', root, [LABEL_X + BEAM_M, STATOR_BOTTOM, WEB_Z]);
  label(context, 'poweredSection', wave, [LABEL_X, STATOR_BOTTOM, -STATOR.sideZ]);
  label(context, 'travellingWave', wave, [TRAIN.noseX, STATOR_BOTTOM, STATOR.sideZ]);
  return {
    root,
    setState(state: AssemblyState) {
      wave.visible = state.view.wave && state.wave.on;
    },
  };
}

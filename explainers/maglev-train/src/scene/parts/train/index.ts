import type { AssemblyState, Point } from '../../../ids';
import { ANCHOR_POINTS, SECTION_EXTENTS, TRAIN } from '../../../model';
import { box } from '@core/scene/geometry/box';
import { applyTrainPose } from '../../pose';
import { label, namedGroup, partMesh, sceneAnchor } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { LABEL_POINTS } from './labels';

export function buildTrain(context: PartContext): Section {
  const root = namedGroup('trainRoot');
  const posed = namedGroup('trainPosed', root);
  const ahead = namedGroup('trainAhead', posed);
  SECTION_EXTENTS.forEach(([from, to], index) => {
    const geometry = box({
      minX: from,
      maxX: to,
      minY: TRAIN.bodyBottom,
      maxY: TRAIN.roof,
      minZ: -TRAIN.width / 2,
      maxZ: TRAIN.width / 2,
    });
    (index === 0 ? ahead : posed).add(partMesh(context, geometry, 'train'));
  });
  Object.entries(LABEL_POINTS).forEach(([part, point]) =>
    label(context, part as keyof typeof LABEL_POINTS, posed, point as Point),
  );
  (['nose', 'tail', 'arm', 'cut'] as const).forEach((id) =>
    sceneAnchor(context, id, posed, ANCHOR_POINTS[id]),
  );
  let lateralMm = 0;
  let current: AssemblyState | null = null;

  return {
    root,
    setState(state: AssemblyState) {
      current = state;
      applyTrainPose(posed, state.motion, lateralMm);
      ahead.visible = !state.view.cutaway;
    },
    animate(frame: Frame, state: AssemblyState) {
      lateralMm = frame.nudge.lateralMm;
      applyTrainPose(posed, (current ?? state).motion, lateralMm);
      return false;
    },
  };
}

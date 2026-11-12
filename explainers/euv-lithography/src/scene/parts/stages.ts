import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';

export function* buildStages(context: PartContext): Steps<Section> {
  const root = namedGroup('stages');
  label(context, 'maskStage', root, PART_POINTS.maskStage);
  label(context, 'mask', root, PART_POINTS.mask);
  label(context, 'pellicle', root, PART_POINTS.pellicle);
  label(context, 'waferStage', root, PART_POINTS.waferStage);
  label(context, 'wafer', root, PART_POINTS.wafer);
  sceneAnchor(context, 'mask', root, ANCHOR_POINTS.mask);
  sceneAnchor(context, 'wafer', root, ANCHOR_POINTS.wafer);
  yield;
  return { root, setState: () => undefined };
}

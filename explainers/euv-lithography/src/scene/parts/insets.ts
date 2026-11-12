import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';

export function* buildInsets(context: PartContext): Steps<Section> {
  const root = namedGroup('insets');
  label(context, 'dropletInset', root, PART_POINTS.dropletInset);
  label(context, 'patternInset', root, PART_POINTS.patternInset);
  label(context, 'hair', root, PART_POINTS.hair);
  label(context, 'virus', root, PART_POINTS.virus);
  sceneAnchor(context, 'dropletInset', root, ANCHOR_POINTS.dropletInset);
  sceneAnchor(context, 'patternInset', root, ANCHOR_POINTS.patternInset);
  yield;
  return { root, setState: () => undefined };
}

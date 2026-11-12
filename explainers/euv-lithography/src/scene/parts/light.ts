import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';

export function* buildLight(context: PartContext): Steps<Section> {
  const root = namedGroup('light');
  label(context, 'flash', root, PART_POINTS.flash);
  label(context, 'droplets', root, PART_POINTS.droplets);
  label(context, 'plasma', root, PART_POINTS.plasma);
  sceneAnchor(context, 'flash', root, ANCHOR_POINTS.flash);
  sceneAnchor(context, 'plasma', root, ANCHOR_POINTS.plasma);
  yield;
  return { root, setState: () => undefined };
}

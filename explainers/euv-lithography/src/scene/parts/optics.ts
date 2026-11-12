import type { Steps } from '@core/scene/pacing';
import { PART_POINTS } from '../../model/layout';
import { label, namedGroup } from './context';
import type { PartContext, Section } from './context';

export function* buildOptics(context: PartContext): Steps<Section> {
  const root = namedGroup('optics');
  label(context, 'illuminator', root, PART_POINTS.illuminator);
  label(context, 'projection', root, PART_POINTS.projection);
  yield;
  return { root, setState: () => undefined };
}

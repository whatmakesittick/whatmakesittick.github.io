import type { Steps } from '@core/scene/pacing';
import { PART_POINTS } from '../../model/layout';
import { label, namedGroup } from './context';
import type { PartContext, Section } from './context';

export function* buildFab(context: PartContext): Steps<Section> {
  const root = namedGroup('fab');
  label(context, 'driveLaser', root, PART_POINTS.driveLaser);
  yield;
  return { root, setState: () => undefined };
}

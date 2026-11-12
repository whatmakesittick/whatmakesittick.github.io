import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';

export function* buildSource(context: PartContext): Steps<Section> {
  const root = namedGroup('source');
  label(context, 'beamTransport', root, PART_POINTS.beamTransport);
  label(context, 'vessel', root, PART_POINTS.vessel);
  label(context, 'collector', root, PART_POINTS.collector);
  label(context, 'intermediateFocus', root, PART_POINTS.intermediateFocus);
  sceneAnchor(context, 'intermediateFocus', root, ANCHOR_POINTS.intermediateFocus);
  yield;
  return { root, setState: () => undefined };
}

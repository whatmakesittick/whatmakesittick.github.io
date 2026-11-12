import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';
import { Batch } from './fab/batch';
import { buildCollector } from './source/collector';
import { buildDroplets } from './source/droplets';
import { buildFocus } from './source/focus';
import { buildPorts } from './source/ports';
import { buildPumps } from './source/pumps';
import { buildTransport } from './source/transport';
import { buildVessel } from './source/vessel';
import { AXIS_Y, FOCUS_X, TUBE_R } from './source/dims';

const TUBE_LABEL_X = -5.1;
const COLLECTOR_LABEL: [number, number, number] = [-2.4, AXIS_Y, 0.72];
const FOCUS_LABEL: [number, number, number] = [FOCUS_X + 0.08, AXIS_Y, 0.27];
const TUBE_LABEL_LIFT = 0.015;

export function* buildSource(context: PartContext): Steps<Section> {
  const root = namedGroup('source');
  const batch = new Batch(context);
  buildTransport(batch);
  yield;
  buildVessel(batch);
  yield;
  buildPorts(batch);
  buildPumps(batch);
  yield;
  buildDroplets(batch);
  yield;
  buildCollector(batch);
  buildFocus(batch);
  yield;
  batch.flush(root);
  label(context, 'beamTransport', root, [TUBE_LABEL_X, AXIS_Y + TUBE_R + TUBE_LABEL_LIFT, 0]);
  label(context, 'vessel', root, PART_POINTS.vessel);
  label(context, 'collector', root, COLLECTOR_LABEL);
  label(context, 'intermediateFocus', root, FOCUS_LABEL);
  sceneAnchor(context, 'intermediateFocus', root, ANCHOR_POINTS.intermediateFocus);
  return {
    root,
    setState: (state) => batch.cutaway.set(state.view.cutaway),
  };
}

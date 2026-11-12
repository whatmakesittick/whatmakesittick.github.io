import type { Steps } from '@core/scene/pacing';
import { PART_POINTS } from '../../model/layout';
import { label, namedGroup } from './context';
import type { PartContext, Section } from './context';
import { Batch } from './fab/batch';
import { ROOM } from './fab/dims';
import { buildFloor } from './fab/floor';
import { buildHatch } from './fab/hatch';
import { buildLaserChain } from './fab/laserChain';
import { buildRoom } from './fab/laserRoom';
import { buildSubfab } from './fab/subfab';

const LABEL_LIFT = 0.06;

export function* buildFab(context: PartContext): Steps<Section> {
  const root = namedGroup('fab');
  const batch = new Batch(context);
  root.add(buildFloor(context, batch));
  yield;
  buildHatch(batch);
  yield;
  buildSubfab(context, batch, root);
  yield;
  buildRoom(batch);
  buildLaserChain(batch);
  yield;
  batch.flush(root);
  const [centreX, centreY] = PART_POINTS.driveLaser;
  label(context, 'driveLaser', root, [centreX, centreY, ROOM.z[1] + LABEL_LIFT]);
  return { root, setState: () => undefined };
}

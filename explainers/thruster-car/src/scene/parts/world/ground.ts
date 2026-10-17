import { Group } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { bushesGeometry, scatterBushes } from '../../geometry/site/bushes';
import { groundGeometry } from '../../geometry/site/groundGrid';
import { scrubMap } from '../../geometry/site/scrub';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { WORLD_FINISHES, groundFinish } from './finishes';

export function createGround(context: PartContext): Group {
  const ground = new Group();
  ground.name = 'ground';
  const map = context.tracker.track(scrubMap());
  const field = partMesh(context, groundGeometry(), UNDIMMED_GROUP, groundFinish(map));
  const bushes = partMesh(
    context,
    bushesGeometry(scatterBushes()),
    UNDIMMED_GROUP,
    WORLD_FINISHES.bushes,
  );
  ground.add(field, bushes);
  return ground;
}

import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Mesh } from 'three';
import type { ConcreteMaps } from '../../geometry/site/concrete';
import type { Pit } from '../../geometry/site/pit';
import type { SupportPlan } from '../../geometry/site/rampSupports';
import { footingsGeometry } from '../../geometry/site/rampSupports';
import { pitLinerGeometry } from '../../geometry/site/slab';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { WORLD_PAINT, concreteFinish } from './finishes';

export function createGroundworks(
  context: PartContext,
  concrete: ConcreteMaps,
  pit: Pit | null,
  plan: SupportPlan,
): Mesh {
  const parts = [...(pit ? [pitLinerGeometry(pit)] : []), ...footingsGeometry(plan)];
  const mesh = partMesh(
    context,
    mergeParts(parts),
    STRUCTURE_GROUP,
    concreteFinish(concrete.map, concrete.normal, WORLD_PAINT.pitConcrete),
  );
  mesh.name = 'groundworks';
  return mesh;
}

import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Mesh } from 'three';
import type { ConcreteMaps } from '../../geometry/site/concrete';
import { footingsGeometry } from '../../geometry/site/rampTruss';
import type { TrussPlan } from '../../geometry/site/rampTruss';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { CONCRETE_LOOKS, concreteFinish } from './finishes';

export function createGroundworks(
  context: PartContext,
  concrete: ConcreteMaps,
  plan: TrussPlan,
): Mesh {
  const mesh = partMesh(
    context,
    mergeParts(footingsGeometry(plan)),
    STRUCTURE_GROUP,
    concreteFinish(concrete.map, concrete.normal, CONCRETE_LOOKS.footing),
  );
  mesh.name = 'groundworks';
  return mesh;
}

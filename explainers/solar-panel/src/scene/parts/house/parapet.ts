import type { Extent } from '../../../model';
import { PARAPET, TERRACE } from '../../../model';
import { COPING, PARAPET_BODY_HEIGHT, PARAPET_INNER } from '../../constants';
import { block, grow } from '../../geometry/blocks';
import type { FinishBatch } from '../batch';

interface Side {
  x: Extent;
  z: Extent;
}

function sides(): Side[] {
  return [
    { x: TERRACE.x, z: [PARAPET_INNER.z[1], TERRACE.z[1]] },
    { x: TERRACE.x, z: [TERRACE.z[0], PARAPET_INNER.z[0]] },
    { x: [TERRACE.x[0], PARAPET_INNER.x[0]], z: PARAPET_INNER.z },
    { x: [PARAPET_INNER.x[1], TERRACE.x[1]], z: PARAPET_INNER.z },
  ];
}

export function addParapet(batch: FinishBatch): void {
  const bodyTop = TERRACE.y + PARAPET_BODY_HEIGHT;
  sides().forEach(({ x, z }) => {
    batch.add('plaster', block(x, [TERRACE.y, bodyTop], z));
    batch.add(
      'coping',
      block(
        grow(x, COPING.overhang),
        [bodyTop, TERRACE.y + PARAPET.height],
        grow(z, COPING.overhang),
      ),
    );
  });
}

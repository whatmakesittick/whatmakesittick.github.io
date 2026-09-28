import { BULKHEAD, TERRACE } from '../../../model';
import { BULKHEAD_ROOF, DOOR } from '../../constants';
import { around, block, grow } from '../../geometry/blocks';
import type { FinishBatch } from '../batch';

const SOUTH_FACE = BULKHEAD.z[1];

function addDoor(batch: FinishBatch): void {
  const x = around(DOOR.centreX, DOOR.width);
  const top = TERRACE.y + DOOR.height;
  const frameZ = [SOUTH_FACE, SOUTH_FACE + DOOR.frameReach] as const;
  batch.add(
    'windowFrame',
    block([x[0] - DOOR.frame, x[0]], [TERRACE.y, top + DOOR.frame], frameZ),
    block([x[1], x[1] + DOOR.frame], [TERRACE.y, top + DOOR.frame], frameZ),
    block(grow(x, DOOR.frame), [top, top + DOOR.frame], frameZ),
  );
  batch.add('door', block(x, [TERRACE.y, top], [SOUTH_FACE, SOUTH_FACE + DOOR.leafReach]));
  const { handle, step, lamp } = DOOR;
  batch.add(
    'steel',
    block(around(x[1] - handle.offset, handle.width), around(handle.y, handle.height), [
      SOUTH_FACE + DOOR.leafReach,
      SOUTH_FACE + handle.reach,
    ]),
  );
  batch.add(
    'concrete',
    block(
      grow(x, step.overhang),
      [TERRACE.y, TERRACE.y + step.height],
      [SOUTH_FACE, SOUTH_FACE + step.depth],
    ),
  );
  batch.add(
    'lamp',
    block(around(DOOR.centreX, lamp.width), around(lamp.y, lamp.height), [
      SOUTH_FACE,
      SOUTH_FACE + lamp.reach,
    ]),
  );
}

export function addBulkhead(batch: FinishBatch): void {
  batch.add('plaster', block(BULKHEAD.x, [TERRACE.y, BULKHEAD_ROOF.bodyTop], BULKHEAD.z));
  batch.add(
    'coping',
    block(
      grow(BULKHEAD.x, BULKHEAD_ROOF.overhang),
      [BULKHEAD_ROOF.bodyTop, BULKHEAD.height],
      grow(BULKHEAD.z, BULKHEAD_ROOF.overhang),
    ),
  );
  addDoor(batch);
}

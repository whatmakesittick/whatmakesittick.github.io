import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { TERRACE } from '../../../model';
import { DOWNPIPE, HOUSE, WINDOW } from '../../constants';
import { around, block, grow } from '../../geometry/blocks';
import type { FinishBatch } from '../batch';

const SOUTH_FACE = TERRACE.z[1];

function windowPieces(centre: number): {
  frame: BufferGeometry[];
  glass: BufferGeometry[];
  ledge: BufferGeometry;
} {
  const x = around(centre, WINDOW.width);
  const y = [WINDOW.sill, WINDOW.head] as const;
  const reach = [SOUTH_FACE, SOUTH_FACE + WINDOW.reach] as const;
  const frame = [
    block(x, [y[0], y[0] + WINDOW.frame], reach),
    block(x, [y[1] - WINDOW.frame, y[1]], reach),
    block([x[0], x[0] + WINDOW.frame], y, reach),
    block([x[1] - WINDOW.frame, x[1]], y, reach),
    block(around(centre, WINDOW.mullion), y, reach),
  ];
  const glassZ = [SOUTH_FACE, SOUTH_FACE + WINDOW.reach - WINDOW.glassInset] as const;
  const glass = [block(grow(x, -WINDOW.frame), grow(y, -WINDOW.frame), glassZ)];
  const ledge = block(
    grow(x, WINDOW.ledge.overhang),
    [y[0] - WINDOW.ledge.height, y[0]],
    [SOUTH_FACE, SOUTH_FACE + WINDOW.ledge.reach],
  );
  return { frame, glass, ledge };
}

function downpipe(): BufferGeometry[] {
  const { hopper, radius } = DOWNPIPE;
  const top = HOUSE.wallTop - HOUSE.cornice.height;
  const length = top - hopper.height - HOUSE.bottom;
  const pipe = new CylinderGeometry(radius, radius, length, DOWNPIPE.segments);
  pipe.translate(DOWNPIPE.x, HOUSE.bottom + length / 2, DOWNPIPE.z);
  const head = block(
    around(DOWNPIPE.x, hopper.width),
    [top - hopper.height, top],
    around(DOWNPIPE.z, hopper.depth),
  );
  return [pipe, head];
}

export function addWalls(batch: FinishBatch): void {
  const { cornice, plinth } = HOUSE;
  batch.add('plaster', block(TERRACE.x, [HOUSE.bottom, HOUSE.wallTop], TERRACE.z));
  batch.add(
    'coping',
    block(
      grow(TERRACE.x, cornice.reach),
      [HOUSE.wallTop - cornice.height, HOUSE.wallTop],
      grow(TERRACE.z, cornice.reach),
    ),
  );
  batch.add(
    'plinth',
    block(
      grow(TERRACE.x, plinth.reach),
      [HOUSE.bottom, HOUSE.bottom + plinth.height],
      grow(TERRACE.z, plinth.reach),
    ),
  );
  WINDOW.centres.forEach((centre) => {
    const pieces = windowPieces(centre);
    batch.add('windowFrame', ...pieces.frame);
    batch.add('windowGlass', ...pieces.glass);
    batch.add('coping', pieces.ledge);
  });
  batch.add('pvc', ...downpipe());
}

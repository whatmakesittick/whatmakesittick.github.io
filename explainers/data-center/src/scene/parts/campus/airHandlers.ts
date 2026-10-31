import type { Object3D } from 'three';
import { AIR_HANDLER, AIR_HANDLERS, WALL_PIPE_X, boxCentre } from '../../../model';
import type { PartContext } from '../context';
import { drawer, rod, spread } from './pipeKit';
import type { Tagged } from './pipeKit';

const FRONT = -AIR_HANDLER.width / 2;
const BACK = AIR_HANDLER.width / 2;
const EDGE = AIR_HANDLER.depth / 2;
const TOP = AIR_HANDLER.height;
const DOOR = (2 * EDGE) / 3 / 2 - 0.02;
const STUB_R = 0.07;

const TABLE: readonly Tagged[] = [
  ['steelLight', [FRONT, BACK, 0.1, TOP, -EDGE, EDGE]],
  ['steelDark', [FRONT + 0.04, BACK - 0.04, 0, 0.1, 0.04 - EDGE, EDGE - 0.04]],
  ['steelDark', [BACK + 0.2, BACK + 0.32, 1.0, 1.2, -0.1, 0.1]],
  ['fan', [FRONT - 0.02, FRONT, 0.14, 0.56, 0.06 - EDGE, EDGE - 0.06]],
  ['fan', [FRONT + 0.08, BACK - 0.08, TOP, TOP + 0.04, 0.08 - EDGE, EDGE - 0.08]],
  ...spread(3, -EDGE, EDGE).flatMap((z): Tagged[] => [
    ['cabinet', [FRONT - 0.025, FRONT, 0.62, 2.12, z - DOOR, z + DOOR]],
    ['steelDark', [FRONT - 0.045, FRONT - 0.025, 1.25, 1.45, z + DOOR - 0.12, z + DOOR - 0.08]],
  ]),
  ...spread(6, 0.14, 0.56).map((y): Tagged => [
    'steelDark',
    [FRONT - 0.04, FRONT - 0.02, y - 0.01, y + 0.01, 0.06 - EDGE, EDGE - 0.06],
  ]),
  ...spread(16, 0.08 - EDGE, EDGE - 0.08).map((z): Tagged => [
    'steel',
    [FRONT + 0.08, BACK - 0.08, TOP + 0.04, TOP + 0.06, z - 0.015, z + 0.015],
  ]),
];

export function buildAirHandlers(context: PartContext, group: Object3D): void {
  const draw = drawer(context, 'airHandlers', group);
  draw.table(
    AIR_HANDLERS.map(({ base }) => base),
    TABLE,
  );
  const stubs = AIR_HANDLERS.map((spec) => {
    const [x, y, z] = boxCentre(spec);
    return rod([x + BACK - 0.02, y, z], [WALL_PIPE_X, y, z], STUB_R);
  });
  draw.rods('pipeInsulated', stubs);
}

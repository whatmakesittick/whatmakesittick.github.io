import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { STACK } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const QUARTER_TURN = Math.PI / 2;
const CORNERS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1] - size[1] / 2,
    maxY: at[1] + size[1] / 2,
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function boardsGeometry(): BufferGeometry {
  const { board, centre } = STACK;
  return mergeParts(
    board.levels.map((level) =>
      centredBox(
        [centre[0], centre[1] + level, centre[2]],
        [board.size, board.thickness, board.size],
      ),
    ),
  );
}

function standoffsGeometry(): BufferGeometry {
  const { board, standoff, centre } = STACK;
  const height = board.levels[1] - board.levels[0];
  return mergeParts(
    CORNERS.map(([sx, sz]) => {
      const post = new CylinderGeometry(
        standoff.radius,
        standoff.radius,
        height,
        standoff.segments,
      );
      post.translate(
        centre[0] + sx * standoff.inset,
        centre[1] + (board.levels[0] + board.levels[1]) / 2,
        centre[2] + sz * standoff.inset,
      );
      return post;
    }),
  );
}

function capacitorGeometry(): BufferGeometry {
  const { capacitor, centre } = STACK;
  const can = new CylinderGeometry(capacitor.radius, capacitor.radius, capacitor.length, 12);
  can.rotateZ(QUARTER_TURN);
  can.translate(
    centre[0] + capacitor.at[0],
    centre[1] + capacitor.at[1],
    centre[2] + capacitor.at[2],
  );
  return can;
}

function chipsGeometry(): BufferGeometry {
  const { chips, board, centre } = STACK;
  const top = centre[1] + board.levels[1] + board.thickness / 2;
  return mergeParts(
    chips.map(({ at, size }) =>
      centredBox([centre[0] + at[0], top + size[1] / 2, centre[2] + at[2]], size),
    ),
  );
}

export interface StackPart {
  object: Group;
  label: Object3D;
}

export function buildStack(context: PartContext): StackPart {
  const object = new Group();
  object.add(
    partMesh(context, boardsGeometry(), 'stack', FINISHES.pcb),
    partMesh(context, standoffsGeometry(), 'stack', FINISHES.aluminium),
    partMesh(context, capacitorGeometry(), 'stack', FINISHES.capacitor),
    partMesh(context, chipsGeometry(), 'stack', FINISHES.chip),
  );
  const { centre, board } = STACK;
  const label = anchorAt(
    object,
    centre[0],
    centre[1] + board.levels[1],
    centre[2] + board.size / 2,
  );
  return { object, label };
}

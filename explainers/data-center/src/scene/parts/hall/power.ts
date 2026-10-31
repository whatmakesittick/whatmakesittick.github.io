import { BoxGeometry } from 'three';
import type { BufferGeometry, Group, Matrix4 } from 'three';
import type { Extent } from '@core/scene/regions';
import {
  BUSWAY,
  HALL_RACKS,
  RACK,
  RACK_RUN_M,
  ROOM_WALL_X,
  ROWS,
  ROW_Z,
  TAP_BOX,
  UPS,
} from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { BRACE_X, CHANNEL_Y, hungFromCeiling } from './ceiling';
import type { CeilingGrid } from './ceiling';
import { instances } from './instances';
import { along, openBox, rodBetween, rodGeometry, runMatrix } from './shapes';

const MAIN: Profile = { wide: 0.24, tall: 0.2 };
const ROW: Profile = { wide: 0.14, tall: 0.16 };
const UPS_AISLE_X = -25.5;
const FEED_Y = 0.5;
const BLOCK_FEED_X = [BUSWAY.endX, 11.7] as const;
const JOINT_PITCH_M = 3;
const JOINT_M = 0.05;
const JOINT_GROW = 1.12;
const HANGER_R = 0.008;
const TAP = { x: 0.2, y: 0.26, z: 0.24, drop: 0.035 } as const;
const TAP_Y = TAP_BOX[1] - 0.02;
const WHIP_R = 0.018;
const WHIP_SIDES = 6;
const HANGER_SIDES = 3;
const ROW_HANGERS = [1.2, 3.6, 6.0] as const;

interface Profile {
  wide: number;
  tall: number;
}

interface Run {
  x: Extent;
  y: Extent;
  z: Extent;
}

function span(from: number, to: number, pad: number): Extent {
  return [Math.min(from, to) - pad, Math.max(from, to) + pad];
}

function alongX(from: number, to: number, y: number, z: number, size = MAIN): Run {
  return { x: span(from, to, size.wide / 2), y: along(y, size.tall), z: along(z, size.wide) };
}

function alongZ(x: number, y: number, from: number, to: number, size = MAIN): Run {
  return { x: along(x, size.wide), y: along(y, size.tall), z: span(from, to, size.wide / 2) };
}

function upright(x: number, from: number, to: number, z: number, size = MAIN): Run {
  return { x: along(x, size.wide), y: span(from, to, size.tall / 2), z: along(z, size.wide) };
}

function runs(): Run[] {
  const [upsX, , upsZ] = UPS.base;
  const upsFace = upsX + UPS.size[0] / 2;
  const north = ROW_Z[0];
  const south = ROW_Z[ROW_Z.length - 1];
  return [
    alongX(upsFace, UPS_AISLE_X, FEED_Y, upsZ),
    upright(UPS_AISLE_X, FEED_Y, BUSWAY.mainY, upsZ),
    alongZ(UPS_AISLE_X, BUSWAY.mainY, upsZ, BUSWAY.mainZ),
    alongX(UPS_AISLE_X, BLOCK_FEED_X[1], BUSWAY.mainY, BUSWAY.mainZ),
    ...BLOCK_FEED_X.map((x) => alongZ(x, BUSWAY.mainY, north, south)),
    ...ROWS.flatMap((row) => {
      const x = BLOCK_FEED_X[row.block];
      return [
        upright(x, BUSWAY.rowY, BUSWAY.mainY, row.z, ROW),
        alongX(x, row.startX + RACK_RUN_M, BUSWAY.rowY, row.z, ROW),
      ];
    }),
  ];
}

function joints(run: Run): Matrix4[] {
  const sizes = [run.x[1] - run.x[0], run.y[1] - run.y[0], run.z[1] - run.z[0]];
  const axis = sizes.indexOf(Math.max(...sizes));
  const extents = [run.x, run.y, run.z];
  const [from, to] = extents[axis];
  const count = Math.floor((to - from) / JOINT_PITCH_M);
  return Array.from({ length: count }, (_, index) => {
    const at = from + (index + 1) * ((to - from) / (count + 1));
    const box = extents.map((extent, which) => {
      const centre = (extent[0] + extent[1]) / 2;
      const size = which === axis ? JOINT_M : (extent[1] - extent[0]) * JOINT_GROW;
      return along(which === axis ? at : centre, size);
    });
    return runMatrix(box[0], box[1], box[2]);
  });
}

export function buswayLines(): number[] {
  return [...ROW_Z];
}

function hangers(grid: CeilingGrid): Matrix4[] {
  const rod = (x: number, top: number, z: number) =>
    rodBetween([x, top, z], [x, CHANNEL_Y, z], HANGER_R);
  const mainTop = BUSWAY.mainY + MAIN.tall / 2;
  const main = BRACE_X.filter((x) => x > ROOM_WALL_X && x < BLOCK_FEED_X[1]).map((x) =>
    rod(x, mainTop, BUSWAY.mainZ + MAIN.wide / 3),
  );
  const cross = BLOCK_FEED_X.flatMap((x) =>
    grid.hangers(ROW_Z[0], ROW_Z[ROW_Z.length - 1]).map((z) => rod(x, mainTop, z)),
  );
  const rows = ROWS.flatMap((row) =>
    ROW_HANGERS.map((offset) => rod(row.startX + offset, BUSWAY.rowY + ROW.tall / 2, row.z)),
  );
  return [...main, ...cross, ...rows];
}

function tapBoxes(): Matrix4[] {
  return HALL_RACKS.map(({ base: [x, , z] }) =>
    runMatrix(along(x, TAP.x), along(TAP_Y - TAP.drop, TAP.y), along(z, TAP.z)),
  );
}

function whips(): Matrix4[] {
  const bottom = TAP_Y - TAP.drop - TAP.y / 2;
  return HALL_RACKS.map(({ base: [x, , z] }) =>
    rodBetween([x, bottom, z], [x, RACK.height - 0.02, z], WHIP_R),
  );
}

export function buildBusway(context: PartContext, parent: Group, grid: CeilingGrid): Group {
  const group = namedGroup('busway', parent);
  const cube = new BoxGeometry();
  const all = runs();
  const mesh = (
    finish: keyof typeof FINISHES,
    matrices: Matrix4[],
    geometry: BufferGeometry = cube,
  ) =>
    group.add(
      instances(context, geometry, context.materials.get('busway', FINISHES[finish]), matrices),
    );
  mesh(
    'busway',
    all.map((run) => runMatrix(run.x, run.y, run.z)),
  );
  mesh('steelDark', all.flatMap(joints), cube.clone());
  mesh('steel', tapBoxes(), openBox(['py']));
  mesh('cable', whips(), rodGeometry(WHIP_SIDES, true));
  group.add(
    hungFromCeiling(
      instances(
        context,
        rodGeometry(HANGER_SIDES, true),
        context.materials.get('busway', FINISHES.steel),
        hangers(grid),
      ),
    ),
  );
  label(context, 'busway', group, [BUSWAY.endX + 3, BUSWAY.mainY + MAIN.tall / 2, BUSWAY.mainZ]);
  return group;
}

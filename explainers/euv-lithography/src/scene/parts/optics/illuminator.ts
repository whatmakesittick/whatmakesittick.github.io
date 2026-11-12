import type { Steps } from '@core/scene/pacing';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Point } from '../../../ids';
import type { WaypointId } from '../../../model/layout';
import { mirrorSizeM } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { DECK_TOP_Y, ILLUMINATOR_BAY, ILLUMINATOR_BODY, MODULE_TOP_Y, POST_M } from '../body';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { LINER_M, addPosts, depth, faceOf, onFace, spanOf, studRow } from '../enclosure';
import type { Face, Opening } from '../enclosure';
import { Cutaway, pipe } from '../kit';
import {
  ENTRY,
  ILLUMINATOR_COLUMN_X,
  ILLUMINATOR_DUCT_Y,
  ILLUMINATOR_PUMP,
  ILLUMINATOR_SLOT,
  SKIN_M,
} from './dims';
import { addEntry } from './entry';
import { addFace, coat, door, gap, glazing, lining } from './faces';
import { addClamp, addCollar, addEye, addPump, addTopRun, addTray } from './fittings';
import { Bin, slab } from './geo';
import { mirrorSet } from './mirror';
import type { OpticsModule } from './module';

const PART = 'illuminator';
const MIRRORS: readonly WaypointId[] = ['i1', 'i2', 'i3', 'i4'];
const RIM_LIFT_M = 0.02;
const COLUMN_WINDOW = { u: [0.22, 0.78], v: [0.9, 3.45] } as const;
const DUCT_WINDOW = { u: [1.05, 2.75], v: [2.7, 3.45] } as const;
const BAY_DOORS = { first: [1.0, 1.85], second: [1.95, 2.8], front: [0.85, 2.35] } as const;
const BACK_DOOR_V = [1.35, 2.45] as const;
const BAR = { half: 0.018, proud: 0.012, boltPitch: 0.2, boltInset: 0.08 } as const;
const ENTRY_HOLE_HALF_M = 0.125;
const TRAY = { x: [0.95, 2.85], y: 3.3 } as const;
const PIPES = [
  { finish: 'copper', y: 1.0 },
  { finish: 'rail', y: 1.15 },
] as const;
const PIPE = {
  radius: 0.022,
  z: -0.83,
  farX: 2.7,
  nearX: 0.0,
  riseY: 3.3,
  clampXs: [0.35, 1.0, 1.6, 2.3],
  riseClampY: 2.2,
} as const;
const RUN = { y: 3.63, z: 0, xs: [0.4, 1.85], radius: 0.02 } as const;
const EYES: readonly Point[] = [
  [0.25, MODULE_TOP_Y, -0.55],
  [0.25, MODULE_TOP_Y, 0.55],
  [2.0, MODULE_TOP_Y, -0.55],
  [2.0, MODULE_TOP_Y, 0.55],
];
const TOP_BOLT_ROWS = { zs: [-0.62, 0.62], from: 0.2, to: 2.0 } as const;

const { min, max } = ILLUMINATOR_BODY;
const FRONT = faceOf(min, max, 'z', 1);
const BACK = faceOf(min, max, 'z', -1);
const START = faceOf(min, max, 'x', -1);
const TOP = faceOf(min, max, 'y', 1);
const WALL: Face = { axis: 'x', side: 1, plane: max[0] };
const COLUMN_X = ILLUMINATOR_COLUMN_X;
const DUCT_Y = ILLUMINATOR_DUCT_Y;
const SLOT: Opening = {
  u: [ILLUMINATOR_SLOT.min[0], ILLUMINATOR_SLOT.max[0]],
  v: [ILLUMINATOR_SLOT.min[2], ILLUMINATOR_SLOT.max[2]],
};
const ENTRY_HOLE: Opening = {
  u: [-ENTRY_HOLE_HALF_M, ENTRY_HOLE_HALF_M],
  v: [ENTRY.y - ENTRY_HOLE_HALF_M, ENTRY.y + ENTRY_HOLE_HALF_M],
};
const COLUMN_SPAN: Opening = { u: [min[0], COLUMN_X], v: [min[1], max[1]] };
const DUCT_SPAN: Opening = { u: [COLUMN_X, max[0]], v: [DUCT_Y, max[1]] };

function addBayEdge(fittings: Bin): void {
  const [low, high] = ILLUMINATOR_BAY.u;
  const bar = depth(FRONT, -SKIN_M, BAR.proud);
  fittings.add(
    'machined',
    onFace(FRONT, [low, high], [DUCT_Y - BAR.half, DUCT_Y + BAR.half], bar),
    onFace(FRONT, [low - BAR.half, low + BAR.half], [min[1], DUCT_Y], bar),
  );
  const { boltInset, boltPitch, proud } = BAR;
  studRow(fittings, FRONT, [low + boltInset, DUCT_Y], [high - boltInset, DUCT_Y], proud, boltPitch);
  studRow(fittings, FRONT, [low, min[1] + boltInset], [low, DUCT_Y - boltInset], proud, boltPitch);
}

function addFront(front: Bin, solid: Bin, fittings: Bin): void {
  const glass = { skin: front, fittings };
  addFace(glass, FRONT, COLUMN_SPAN, [glazing(COLUMN_WINDOW.u, COLUMN_WINDOW.v)]);
  addFace(glass, FRONT, DUCT_SPAN, [glazing(DUCT_WINDOW.u, DUCT_WINDOW.v)]);
  addFace({ skin: solid, fittings }, FRONT, { u: ILLUMINATOR_BAY.u, v: ILLUMINATOR_BAY.v }, [
    door(BAY_DOORS.first, BAY_DOORS.front),
    door(BAY_DOORS.second, BAY_DOORS.front, false),
  ]);
  addBayEdge(fittings);
}

function addBackPipes(fittings: Bin): void {
  const reach = BACK.plane - PIPE.z;
  PIPES.forEach(({ finish, y }) => {
    const route: Point[] = [
      [PIPE.farX, y, PIPE.z],
      [PIPE.nearX, y, PIPE.z],
      [PIPE.nearX, PIPE.riseY, PIPE.z],
    ];
    fittings.add(finish, pipe(route, PIPE.radius));
    PIPE.clampXs.forEach((x) => addClamp(fittings, [x, y, PIPE.z], reach));
  });
  addClamp(fittings, [PIPE.nearX, PIPE.riseClampY, PIPE.z], reach);
}

function addBack(solid: Bin, fittings: Bin): void {
  addFace({ skin: solid, fittings }, BACK, spanOf(min, max, BACK), [
    door(BAY_DOORS.first, BACK_DOOR_V),
    door(BAY_DOORS.second, BACK_DOOR_V, false),
  ]);
  addPump(fittings, BACK.plane, ILLUMINATOR_PUMP, ILLUMINATOR_PUMP[0]);
  addTray(fittings, BACK.plane, TRAY.x[0], TRAY.x[1], TRAY.y);
  addBackPipes(fittings);
}

function addTop(solid: Bin, fittings: Bin): void {
  addFace({ skin: solid, fittings }, TOP, spanOf(min, max, TOP), [gap(SLOT.u, SLOT.v)]);
  addCollar(fittings, ILLUMINATOR_SLOT.min, ILLUMINATOR_SLOT.max);
  addTopRun(fittings, [RUN.xs[0], RUN.y, RUN.z], [RUN.xs[1], RUN.y, RUN.z], RUN.radius);
  EYES.forEach((point) => addEye(fittings, point));
  TOP_BOLT_ROWS.zs.forEach((z) =>
    studRow(fittings, TOP, [TOP_BOLT_ROWS.from, z], [TOP_BOLT_ROWS.to, z], 0),
  );
}

function addInterior(solid: Bin): void {
  lining(solid, BACK, COLUMN_SPAN);
  lining(solid, BACK, DUCT_SPAN);
  lining(solid, TOP, spanOf(min, max, TOP), SLOT);
  lining(solid, START, spanOf(min, max, START), ENTRY_HOLE);
  coat(solid, WALL, { u: [min[2], max[2]], v: [DUCT_Y, max[1]] });
  solid.add(
    'interior',
    slab([COLUMN_X, DUCT_Y - LINER_M, min[2]], [max[0], DUCT_Y, max[2]]),
    slab([COLUMN_X, DECK_TOP_Y, min[2]], [COLUMN_X + LINER_M, DUCT_Y, max[2]]),
  );
}

export function* buildIlluminator(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup(PART);
  const solid = new Bin();
  const front = new Bin();
  const fittings = new Bin();
  addFront(front, solid, fittings);
  addFace({ skin: solid, fittings }, START, spanOf(min, max, START), [
    gap(ENTRY_HOLE.u, ENTRY_HOLE.v),
  ]);
  addEntry(fittings);
  yield;
  addBack(solid, fittings);
  addTop(solid, fittings);
  addPosts(fittings, min, max, POST_M);
  addInterior(solid);
  yield;
  const brackets = new Bin();
  mirrorSet(context, {
    group: PART,
    ids: MIRRORS,
    parent: root,
    bracketBin: brackets,
    wallZ: min[2] + SKIN_M + LINER_M,
    sizeOf: (id) => mirrorSizeM(id, 'na033'),
  });
  yield;
  const cutaway = new Cutaway();
  const ghost = context.materials.get(PART, FINISHES.ghost);
  const fronts = front.build(context, PART, root);
  fronts.forEach((target) => cutaway.add(target, ghost));
  const covers = [
    ...fronts,
    ...solid.build(context, PART, root),
    ...fittings.build(context, STRUCTURE_GROUP, root),
  ];
  brackets.build(context, STRUCTURE_GROUP, root);
  label(context, PART, root, [0.5, 3, mirrorSizeM('i2', 'na033') / 2 + RIM_LIFT_M]);
  yield;
  return { root, covers, setState: (state) => cutaway.set(state.view.cutaway) };
}

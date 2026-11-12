import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { BASE, DECK_TOP_Y, FOOT_TOP_Y, WAFER_BAY, WAFER_BAY_WINDOW } from '../body';
import { addPosts, faceOf, spanOf, studRow } from '../enclosure';
import type { Face, Opening } from '../enclosure';
import { Cutaway } from '../kit';
import { addEye, addTray } from './fittings';
import { addFace, coat, door, vent } from './faces';
import type { Fixture } from './faces';
import { Bin, plate, rod, slab } from './geo';
import type { OpticsModule } from './module';

const POST_M = 0.12;
const PLATE_THICKNESS_M = 0.04;
const BEAM_HOLE_M = 0.24;
const BAY_MARGIN_M = 0.02;
const FOOT_XS = [0.18, 1.6, 3.05, 4.52] as const;
const FOOT_Z = 0.68;
const FOOT = {
  pad: { radius: 0.1, top: 0.03 },
  cap: { radius: 0.085, top: 0.045 },
  stem: { radius: 0.035 },
  nut: { radius: 0.06, bottom: 0.06, top: 0.085, sides: 6 },
  padSides: 20,
} as const;
const DOORS = { low: [0.2, 0.62], first: [0.25, 1.05], second: [1.25, 2.05] } as const;
const VENT = { u: [2.3, 3.0], v: [0.3, 0.55] } as const;
const BAY_FRONT_U = [WAFER_BAY.min[0], 4.6] as const;
const BOLT_PITCH_M = 0.18;
const MARGIN_ROWS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [
    [0.15, -0.78],
    [2.85, -0.78],
  ],
  [
    [0.15, 0.78],
    [2.85, 0.78],
  ],
  [
    [0.05, -0.78],
    [0.05, 0.78],
  ],
  [
    [4.5, -0.78],
    [4.5, 0.78],
  ],
  [
    [3.0, -0.825],
    [4.6, -0.825],
  ],
  [
    [3.0, 0.825],
    [4.6, 0.825],
  ],
];
const EYE_POINTS: readonly Point[] = [
  [4.5, DECK_TOP_Y, -0.5],
  [4.5, DECK_TOP_Y, 0.5],
];
const TRAY = { x: [3.25, 4.55], y: 0.5 } as const;
const BAY_BACK_Z = -0.7;

const { min, max } = BASE;
const FRONT = faceOf(min, max, 'z', 1);
const BACK = faceOf(min, max, 'z', -1);
const START = faceOf(min, max, 'x', -1);
const END = faceOf(min, max, 'x', 1);
const TOP: Face = { axis: 'y', side: 1, plane: DECK_TOP_Y };

function addFeet(bin: Bin): void {
  const { pad, cap, stem, nut, padSides } = FOOT;
  FOOT_XS.forEach((x) =>
    [-FOOT_Z, FOOT_Z].forEach((z) => {
      const at = (y: number): Point => [x, y, z];
      bin.add('rubber', rod(at(0), at(pad.top), pad.radius, pad.radius, padSides));
      bin.add('machined', rod(at(pad.top), at(cap.top), cap.radius, cap.radius, padSides));
      bin.add('flange', rod(at(cap.top), at(FOOT_TOP_Y), stem.radius, stem.radius, padSides));
      bin.add('bolt', rod(at(nut.bottom), at(nut.top), nut.radius, nut.radius, nut.sides));
    }),
  );
}

function addTopPlate(bin: Bin): void {
  bin.add(
    'machined',
    plate('y', [min[0], DECK_TOP_Y - PLATE_THICKNESS_M, min[2]], [max[0], DECK_TOP_Y, max[2]], {
      centre: [3.9, DECK_TOP_Y, 0],
      radius: BEAM_HOLE_M,
    }),
  );
  MARGIN_ROWS.forEach(([from, to]) => studRow(bin, TOP, from, to, 0, BOLT_PITCH_M));
  EYE_POINTS.forEach((point) => addEye(bin, point));
}

function addBayWalls(bin: Bin): void {
  const [floor, ceiling] = [FOOT_TOP_Y + 0.06, DECK_TOP_Y - PLATE_THICKNESS_M];
  const front = max[2] - BAY_MARGIN_M;
  const [bayMin, bayMax] = [WAFER_BAY.min[0], 4.6];
  const wall = (face: Face, u: readonly [number, number]): void =>
    coat(bin, face, { u, v: [floor, ceiling] });
  wall({ axis: 'z', side: -1, plane: BAY_BACK_Z }, [bayMin, bayMax]);
  wall({ axis: 'x', side: -1, plane: bayMin }, [BAY_BACK_Z, front]);
  wall({ axis: 'x', side: 1, plane: bayMax }, [BAY_BACK_Z, front]);
  coat(
    bin,
    { axis: 'y', side: 1, plane: ceiling },
    { u: [bayMin, bayMax], v: [BAY_BACK_Z, front] },
    { u: [3.9 - BEAM_HOLE_M, 3.9 + BEAM_HOLE_M], v: [-BEAM_HOLE_M, BEAM_HOLE_M] },
  );
}

function row(face: Face, range: readonly [number, number]): Opening {
  const span = spanOf(min, max, face);
  return { u: range, v: span.v };
}

function addSides(solid: Bin, front: Bin): void {
  const bins = { skin: solid, fittings: solid };
  const span = spanOf(min, max, FRONT);
  const doors: Fixture[] = [
    door(DOORS.first, DOORS.low),
    door(DOORS.second, DOORS.low, false),
    vent(VENT.u, VENT.v),
  ];
  addFace(bins, FRONT, row(FRONT, [min[0], BAY_FRONT_U[0]]), doors);
  addFace({ skin: front, fittings: solid }, FRONT, row(FRONT, BAY_FRONT_U), [
    { kind: 'window', hingeLow: true, opening: WAFER_BAY_WINDOW },
  ]);
  addFace(bins, FRONT, row(FRONT, [BAY_FRONT_U[1], max[0]]));
  addFace(bins, BACK, span, doors);
  addFace(bins, START, spanOf(min, max, START));
  addFace(bins, END, spanOf(min, max, END), [door([-0.45, 0.35], DOORS.low)]);
  addTray(solid, BACK.plane, TRAY.x[0], TRAY.x[1], TRAY.y);
}

export function* buildBase(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup('base');
  const footing = new Bin();
  const shell = new Bin();
  const front = new Bin();
  addPosts(shell, min, max, POST_M);
  addFeet(footing);
  footing.add('granite', slab([min[0], FOOT_TOP_Y, min[2]], [max[0], FOOT_TOP_Y + 0.06, max[2]]));
  yield;
  addSides(shell, front);
  addTopPlate(shell);
  addBayWalls(shell);
  yield;
  const cutaway = new Cutaway();
  const ghost = context.materials.get(STRUCTURE_GROUP, FINISHES.ghost);
  const fronts = front.build(context, STRUCTURE_GROUP, root);
  fronts.forEach((target) => cutaway.add(target, ghost));
  const covers = [...fronts, ...shell.build(context, STRUCTURE_GROUP, root)];
  footing.build(context, STRUCTURE_GROUP, root);
  yield;
  return { root, covers, setState: (state) => cutaway.set(state.view.cutaway) };
}

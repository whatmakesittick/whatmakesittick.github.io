import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { AssemblyState, Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { MASK_MODULE, MASK_MODULE_WINDOW, POST_M } from '../body';
import {
  addDoor,
  addLiner,
  addPosts,
  addSkin,
  addVent,
  addWindow,
  faceOf,
  spanOf,
  studRow,
} from '../enclosure';
import { Cutaway, pipe } from '../kit';
import { Bin, ring, slab } from '../optics/geo';
import {
  MASK_MODULE_DOOR,
  MASK_MODULE_LID,
  MASK_MODULE_PORT,
  MASK_MODULE_PORT_DOOR,
  MASK_MODULE_VENT,
} from './dims';

const { min, max } = MASK_MODULE;
const PORT_POST_M = 0.03;
const PORT_ROUND = 0.01;
const LID_ROUND = 0.006;
const LID_CAP_INSET = 0.05;
const LID_CAP_RISE = 0.01;
const LID_BOLT_Z = 0.53;
const LID_BOLT_OUT = 0.004;
const EYE = {
  x: [2.4, 3.6],
  z: 0.45,
  base: 0.03,
  baseTall: 0.03,
  inner: 0.018,
  outer: 0.035,
  thick: 0.014,
} as const;
const TRAY = { y: 5.12, x: [2.3, 3.8], depth: 0.1, floor: 0.015, lip: 0.07, rod: 0.014 } as const;
const BRACKETS_X = [2.4, 3.1, 3.7] as const;
const BRACKET = { half: 0.015, drop: 0.12, depth: 0.04 } as const;
const COOLANT = { radius: 0.022, x: 3.78, topY: 5.0, lowY: 3.9, lowX: 3.1, z: -0.76 } as const;
const CLAMP_YS = [4.2, 4.7] as const;
const CLAMP = { outer: 0.036, thick: 0.012 } as const;

export interface MaskModule {
  readonly cover: Object3D;
  setState(state: AssemblyState): void;
}

function addShell(structure: Bin): void {
  const back = faceOf(min, max, 'z', -1);
  const ends = [faceOf(min, max, 'x', -1), faceOf(min, max, 'x', 1)];
  const top = faceOf(min, max, 'y', 1);
  const door = faceOf(min, max, 'x', 1);
  addSkin(structure, back, spanOf(min, max, back), [MASK_MODULE_VENT]);
  addVent(structure, back, MASK_MODULE_VENT);
  addSkin(structure, ends[0], spanOf(min, max, ends[0]));
  addSkin(structure, door, spanOf(min, max, door), [MASK_MODULE_DOOR]);
  addDoor(structure, door, MASK_MODULE_DOOR);
  addSkin(structure, top, spanOf(min, max, top));
  [back, ...ends, top].forEach((face) => addLiner(structure, face, spanOf(min, max, face)));
  addPosts(structure, min, max, POST_M);
}

function addPort(structure: Bin): void {
  const { min: low, max: high } = MASK_MODULE_PORT;
  structure.add('machined', slab(low, high, PORT_ROUND));
  const outer = faceOf(low, high, 'x', -1);
  (
    [
      faceOf(low, high, 'y', 1),
      faceOf(low, high, 'y', -1),
      faceOf(low, high, 'z', 1),
      faceOf(low, high, 'z', -1),
    ] as const
  ).forEach((face) => addSkin(structure, face, spanOf(low, high, face)));
  addSkin(structure, outer, spanOf(low, high, outer), [MASK_MODULE_PORT_DOOR]);
  addDoor(structure, outer, MASK_MODULE_PORT_DOOR, false);
  addPosts(structure, low, high, PORT_POST_M);
}

function addLid(structure: Bin): void {
  const { min: low, max: high } = MASK_MODULE_LID;
  structure.add('machined', slab(low, high, LID_ROUND));
  structure.add(
    'panel',
    slab(
      [low[0] + LID_CAP_INSET, high[1], low[2] + LID_CAP_INSET],
      [high[0] - LID_CAP_INSET, high[1] + LID_CAP_RISE, high[2] - LID_CAP_INSET],
      LID_ROUND,
    ),
  );
  const face = faceOf(low, high, 'y', 1);
  [-LID_BOLT_Z, LID_BOLT_Z].forEach((z) =>
    studRow(
      structure,
      face,
      [low[0] + LID_CAP_INSET, z],
      [high[0] - LID_CAP_INSET, z],
      LID_BOLT_OUT,
    ),
  );
  EYE.x.forEach((x) =>
    [-EYE.z, EYE.z].forEach((z) => {
      structure.add(
        'machined',
        slab(
          [x - EYE.base, high[1], z - EYE.base],
          [x + EYE.base, high[1] + EYE.baseTall, z + EYE.base],
          LID_ROUND,
        ),
      );
      structure.add(
        'flange',
        ring(
          'z',
          [x, high[1] + EYE.baseTall + EYE.outer * 0.8, z],
          EYE.inner,
          EYE.outer,
          EYE.thick,
        ),
      );
    }),
  );
}

function addBack(structure: Bin): void {
  const wall = min[2];
  const [from, to] = TRAY.x;
  structure.add(
    'frame',
    slab([from, TRAY.y, wall - TRAY.depth], [to, TRAY.y + TRAY.floor, wall]),
    slab(
      [from, TRAY.y, wall - TRAY.depth],
      [to, TRAY.y + TRAY.lip, wall - TRAY.depth + TRAY.floor],
    ),
  );
  [-1, 1].forEach((side) => {
    const z = wall - TRAY.depth / 2 + side * (TRAY.depth / 4);
    const start: Point = [from + 0.02, TRAY.y + TRAY.floor + TRAY.rod, z];
    structure.add('machined', pipe([start, [to - 0.02, start[1], z]], TRAY.rod, TRAY.rod));
  });
  BRACKETS_X.forEach((x) =>
    structure.add(
      'frame',
      slab(
        [x - BRACKET.half, TRAY.y - BRACKET.drop, wall - BRACKET.depth],
        [x + BRACKET.half, TRAY.y, wall],
        PORT_POST_M / 6,
      ),
    ),
  );
  const route: Point[] = [
    [COOLANT.x, COOLANT.topY, COOLANT.z],
    [COOLANT.x, COOLANT.lowY, COOLANT.z],
    [COOLANT.lowX, COOLANT.lowY, COOLANT.z],
  ];
  structure.add('copper', pipe(route, COOLANT.radius, COOLANT.radius * 3));
  CLAMP_YS.forEach((y) =>
    structure.add('flange', ring('z', [COOLANT.x, y, COOLANT.z], 0, CLAMP.outer, CLAMP.thick)),
  );
}

function addFront(front: Bin): void {
  const face = faceOf(min, max, 'z', 1);
  addSkin(front, face, spanOf(min, max, face), [MASK_MODULE_WINDOW]);
  addWindow(front, face, MASK_MODULE_WINDOW);
}

export function buildMaskModule(context: PartContext, parent: Object3D): MaskModule {
  const root = namedGroup('maskModule', parent);
  const structure = new Bin();
  addShell(structure);
  addPort(structure);
  addLid(structure);
  addBack(structure);
  structure.build(context, STRUCTURE_GROUP, root);
  const front = new Bin();
  addFront(front);
  const cutaway = new Cutaway();
  const ghost = context.materials.get(STRUCTURE_GROUP, FINISHES.ghost);
  front.build(context, STRUCTURE_GROUP, root).forEach((target) => cutaway.add(target, ghost));
  return { cover: root, setState: (state) => cutaway.set(state.view.cutaway) };
}

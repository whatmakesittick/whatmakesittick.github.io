import type { Steps } from '@core/scene/pacing';
import type { Mesh } from 'three';
import { mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import { Cutaway } from '../kit';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import {
  ENTRY,
  ILLUMINATOR,
  ILLUMINATOR_LEGS_X,
  ILLUMINATOR_LEGS_Z,
  ILLUMINATOR_SLOT,
  ILLUMINATOR_WINDOW,
  SKIN_M,
} from './dims';
import { addEntry } from './entry';
import { Bin, plate, slab } from './geo';
import { mirrorSet } from './mirror';
import type { OpticsModule } from './module';
import { frameBeams, legs, paneled } from './skin';
import type { Point } from '../../../ids';

const PART = 'illuminator';
const MIRRORS: readonly WaypointId[] = ['i1', 'i2', 'i3', 'i4'];
const RIM_LIFT_M = 0.02;
const RIM_M = 0.02;
const COLLAR_M = 0.03;
const COLLAR_PROUD_M = 0.02;
const BEAM_FRAME_M = 0.05;
const ACCENT_M = 0.035;
const WINDOW_INSET_M = 0.01;
const ENTRY_HOLE_M = 0.005;

const { min, max } = ILLUMINATOR;

function addSolidSkins(solid: Bin): void {
  paneled(solid, 'z', -1, [min[0], min[1], min[2]], [max[0], max[1], min[2] + SKIN_M], [4, 3]);
  paneled(solid, 'y', -1, [min[0], min[1], min[2]], [max[0], min[1] + SKIN_M, max[2]], [4, 2]);
  paneled(solid, 'x', 1, [max[0] - SKIN_M, min[1], min[2]], [max[0], max[1], max[2]], [2, 3]);
  const { min: slotMin, max: slotMax } = ILLUMINATOR_SLOT;
  const hole = {
    min: [slotMin[0], max[1], slotMin[2]] as Point,
    max: [slotMax[0], max[1], slotMax[2]] as Point,
  };
  solid.add('panelShade', plate('y', [min[0], max[1] - SKIN_M, min[2]], max, hole));
  solid.add(
    'panelShade',
    plate('x', min, [min[0] + SKIN_M, max[1], max[2]], {
      centre: [min[0], ENTRY.y, 0],
      radius: ENTRY.radius + ENTRY_HOLE_M,
    }),
  );
  addCollar(solid, slotMin, slotMax);
}

function addCollar(solid: Bin, slotMin: Point, slotMax: Point): void {
  const top = max[1];
  const lift = top + COLLAR_PROUD_M;
  solid.add(
    'flange',
    slab(
      [slotMin[0] - COLLAR_M, top, slotMin[2] - COLLAR_M],
      [slotMin[0], lift, slotMax[2] + COLLAR_M],
    ),
    slab(
      [slotMax[0], top, slotMin[2] - COLLAR_M],
      [slotMax[0] + COLLAR_M / 2, lift, slotMax[2] + COLLAR_M],
    ),
    slab([slotMin[0], top, slotMin[2] - COLLAR_M], [slotMax[0], lift, slotMin[2]]),
    slab([slotMin[0], top, slotMax[2]], [slotMax[0], lift, slotMax[2] + COLLAR_M]),
  );
}

function addFrontSkin(front: Bin, glass: Bin, solid: Bin): void {
  const z = max[2];
  const view = ILLUMINATOR_WINDOW;
  const strips: [Point, Point, [number, number]][] = [
    [
      [min[0], min[1], z - SKIN_M],
      [max[0], view.min[1], z],
      [4, 1],
    ],
    [
      [min[0], view.max[1], z - SKIN_M],
      [max[0], max[1], z],
      [4, 1],
    ],
    [
      [min[0], view.min[1], z - SKIN_M],
      [view.min[0], view.max[1], z],
      [1, 2],
    ],
    [
      [view.max[0], view.min[1], z - SKIN_M],
      [max[0], view.max[1], z],
      [1, 2],
    ],
  ];
  strips.forEach(([lo, hi, tiles]) => paneled(front, 'z', 1, lo, hi, tiles));
  glass.add(
    'window',
    slab(
      [view.min[0], view.min[1], z - SKIN_M / 2],
      [view.max[0], view.max[1], z - SKIN_M / 2 + WINDOW_INSET_M / 4],
    ),
  );
  addViewportRim(solid, view.min, view.max, z);
}

function addViewportRim(solid: Bin, lo: Point, hi: Point, z: number): void {
  const [front, back] = [z + RIM_LIFT_M / 2, z - RIM_LIFT_M];
  solid.add(
    'flange',
    slab([lo[0] - RIM_M, lo[1] - RIM_M, back], [hi[0] + RIM_M, lo[1], front]),
    slab([lo[0] - RIM_M, hi[1], back], [hi[0] + RIM_M, hi[1] + RIM_M, front]),
    slab([lo[0] - RIM_M, lo[1], back], [lo[0], hi[1], front]),
    slab([hi[0], lo[1], back], [hi[0] + RIM_M, hi[1], front]),
  );
  solid.add(
    'accent',
    slab([min[0], min[1] + 0.03, z], [max[0], min[1] + 0.03 + ACCENT_M, z + 0.006]),
  );
}

export function* buildIlluminator(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup(PART);
  const solid = new Bin();
  const front = new Bin();
  const glass = new Bin();
  const structure = new Bin();
  const bracketBin = new Bin();
  addSolidSkins(solid);
  addEntry(context, solid, root);
  yield;
  addFrontSkin(front, glass, solid);
  frameBeams(structure, min, max, BEAM_FRAME_M, ILLUMINATOR_SLOT.max[2]);
  legs(structure, ILLUMINATOR_LEGS_X, ILLUMINATOR_LEGS_Z, min[1], BEAM_FRAME_M * 1.4);
  yield;
  mirrorSet(context, {
    group: PART,
    ids: MIRRORS,
    parent: root,
    bracketBin,
    wallZ: min[2] + SKIN_M,
    sizeOf: (id) => mirrorSizeM(id, 'na033'),
  });
  yield;
  const cutaway = new Cutaway();
  const ghost = context.materials.get(PART, FINISHES.ghost);
  front.build(context, PART, root).forEach((target: Mesh) => cutaway.add(target, ghost));
  solid.build(context, PART, root);
  glass.build(context, PART, root);
  bracketBin.build(context, PART, root);
  structure.build(context, STRUCTURE_GROUP, root);
  label(context, PART, root, [0.5, 3, mirrorSizeM('i2', 'na033') / 2 + RIM_LIFT_M]);
  yield;
  return { root, setState: (state) => cutaway.set(state.view.cutaway) };
}

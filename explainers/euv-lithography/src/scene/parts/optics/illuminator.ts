import type { Steps } from '@core/scene/pacing';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { WaypointId } from '../../../model/layout';
import { mirrorSizeM } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { Cutaway } from '../kit';
import {
  ILLUMINATOR,
  ILLUMINATOR_HATCH_M,
  ILLUMINATOR_HATCHES,
  ILLUMINATOR_LEGS,
  ILLUMINATOR_OUTLINE,
  ILLUMINATOR_PUMP,
  ILLUMINATOR_SEAMS,
  ILLUMINATOR_SLOT,
  ILLUMINATOR_TRAY,
  ILLUMINATOR_DUCT_Y,
  SKIN_M,
} from './dims';
import { addEntry } from './entry';
import { addHatches, addPump, addSeams, addTray } from './fittings';
import { addFrontSkin, addSolidSkins } from './illuminatorShell';
import { Bin, slab } from './geo';
import { mirrorSet } from './mirror';
import type { OpticsModule } from './module';
import { legs, outlineBeams } from './skin';

const PART = 'illuminator';
const MIRRORS: readonly WaypointId[] = ['i1', 'i2', 'i3', 'i4'];
const RIM_LIFT_M = 0.02;
const BEAM_FRAME_M = 0.05;
const POST_M = 0.08;
const TIE_M = 0.03;
const RIB_M = 0.012;
const TOP_RIBS = [0.5, 1.1, 1.7] as const;

const { min, max } = ILLUMINATOR;

function addBase(structure: Bin): void {
  const { columnXs, ductXs, zs, tieY } = ILLUMINATOR_LEGS;
  legs(structure, columnXs, zs, min[1], POST_M);
  legs(structure, ductXs, zs, ILLUMINATOR_DUCT_Y, POST_M);
  const xs = [...columnXs, ...ductXs];
  const half = TIE_M / 2;
  zs.forEach((z) =>
    structure.add(
      'darkFrame',
      slab([xs[0], tieY - half, z - half], [xs[xs.length - 1], tieY + half, z + half]),
    ),
  );
  xs.forEach((x) =>
    structure.add(
      'darkFrame',
      slab([x - half, tieY - half, zs[0]], [x + half, tieY + half, zs[zs.length - 1]]),
    ),
  );
}

export function* buildIlluminator(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup(PART);
  const solid = new Bin();
  const front = new Bin();
  const glass = new Bin();
  const structure = new Bin();
  addSolidSkins(solid);
  addEntry(solid);
  yield;
  addFrontSkin(front, glass, solid);
  outlineBeams(structure, ILLUMINATOR_OUTLINE, [min[2], max[2]], BEAM_FRAME_M, {
    at: [max[0], max[1]],
    z: ILLUMINATOR_SLOT.max[2],
  });
  addBase(structure);
  TOP_RIBS.forEach((x) =>
    structure.add(
      'darkFrame',
      slab(
        [x - RIB_M / 2, max[1], min[2] + BEAM_FRAME_M],
        [x + RIB_M / 2, max[1] + RIB_M, max[2] - BEAM_FRAME_M],
      ),
    ),
  );
  yield;
  ILLUMINATOR_SEAMS.forEach((grid) => addSeams(structure, min[2], grid));
  addHatches(structure, min[2], ILLUMINATOR_HATCHES, ILLUMINATOR_HATCH_M);
  addPump(structure, min[2], ILLUMINATOR_PUMP, ILLUMINATOR_PUMP[0]);
  addTray(structure, min[2], ILLUMINATOR_TRAY.x[0], ILLUMINATOR_TRAY.x[1], ILLUMINATOR_TRAY.y);
  yield;
  mirrorSet(context, {
    group: PART,
    ids: MIRRORS,
    parent: root,
    bracketBin: structure,
    wallZ: min[2] + SKIN_M,
    sizeOf: (id) => mirrorSizeM(id, 'na033'),
  });
  yield;
  const cutaway = new Cutaway();
  const ghost = context.materials.get(PART, FINISHES.ghost);
  front.build(context, PART, root).forEach((target) => cutaway.add(target, ghost));
  solid.build(context, PART, root);
  glass.build(context, PART, root);
  structure.build(context, STRUCTURE_GROUP, root);
  label(context, PART, root, [0.5, 3, mirrorSizeM('i2', 'na033') / 2 + RIM_LIFT_M]);
  yield;
  return { root, setState: (state) => cutaway.set(state.view.cutaway) };
}

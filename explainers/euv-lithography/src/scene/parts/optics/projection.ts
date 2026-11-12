import type { Steps } from '@core/scene/pacing';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { AssemblyState, Point } from '../../../ids';
import { mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { MODULE_TOP_Y, POST_M, PROJECTION_BODY } from '../body';
import { label, mesh, namedGroup } from '../context';
import type { Frame, PartContext } from '../context';
import { LINER_M, addPosts, faceOf, spanOf, studRow } from '../enclosure';
import type { Opening } from '../enclosure';
import { Cutaway, Ease } from '../kit';
import { BOTTOM_OPENING, IRIS, PROJECTION_TOP_OPENING, SKIN_M } from './dims';
import { addFace, door, gap, glazing, lining, vent } from './faces';
import { addCollar, addEye } from './fittings';
import { Bin, ring } from './geo';
import { mirrorSet } from './mirror';
import type { OpticsModule } from './module';
import { addBack } from './projectionBack';

const PART = 'projection';
const MIRRORS: readonly WaypointId[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const LABEL_LIFT_M = 0.02;
const IRIS_SEGMENT_SCALE = 1;
const LOW_WINDOW = { u: [3.02, 4.18], v: [0.85, 2.1] } as const;
const HIGH_WINDOW = { u: [3.02, 4.18], v: [2.25, 3.45] } as const;
const END_DOOR = { u: [-0.6, 0.2], v: [0.9, 2.6] } as const;
const END_VENT = { u: [0.3, 0.7], v: [0.9, 1.7] } as const;
const BACK_DOOR = { u: [3.95, 4.25], v: [0.9, 2.2] } as const;
const BACK_VENT = { u: [2.98, 3.3], v: [0.9, 1.4] } as const;
const EYES: readonly Point[] = [
  [4.1, MODULE_TOP_Y, -0.55],
  [4.1, MODULE_TOP_Y, 0.55],
];
const TOP_BOLT_ROWS = { zs: [-0.68, 0.68], from: 4.0, to: 4.25 } as const;
const END_BOLT_ROW = { x: 4.12, from: -0.68, to: 0.68 } as const;

const { min, max } = PROJECTION_BODY;
const FRONT = faceOf(min, max, 'z', 1);
const BACK = faceOf(min, max, 'z', -1);
const START = faceOf(min, max, 'x', -1);
const END = faceOf(min, max, 'x', 1);
const TOP = faceOf(min, max, 'y', 1);
const BOTTOM = faceOf(min, max, 'y', -1);
const TOP_HOLE: Opening = {
  u: [PROJECTION_TOP_OPENING.min[0], PROJECTION_TOP_OPENING.max[0]],
  v: [PROJECTION_TOP_OPENING.min[2], PROJECTION_TOP_OPENING.max[2]],
};
const BOTTOM_HOLE: Opening = {
  u: [BOTTOM_OPENING.x - BOTTOM_OPENING.radius, BOTTOM_OPENING.x + BOTTOM_OPENING.radius],
  v: [BOTTOM_OPENING.z - BOTTOM_OPENING.radius, BOTTOM_OPENING.z + BOTTOM_OPENING.radius],
};

function addShell(front: Bin, solid: Bin, fittings: Bin): void {
  const bins = { skin: solid, fittings };
  addFace({ skin: front, fittings }, FRONT, spanOf(min, max, FRONT), [
    glazing(LOW_WINDOW.u, LOW_WINDOW.v),
    glazing(HIGH_WINDOW.u, HIGH_WINDOW.v),
  ]);
  addFace(bins, BACK, spanOf(min, max, BACK), [
    door(BACK_DOOR.u, BACK_DOOR.v, false),
    vent(BACK_VENT.u, BACK_VENT.v),
  ]);
  addFace(bins, START, spanOf(min, max, START));
  addFace(bins, END, spanOf(min, max, END), [
    door(END_DOOR.u, END_DOOR.v),
    vent(END_VENT.u, END_VENT.v),
  ]);
  addFace(bins, TOP, spanOf(min, max, TOP), [gap(TOP_HOLE.u, TOP_HOLE.v)]);
}

function addTopFittings(fittings: Bin): void {
  addCollar(fittings, PROJECTION_TOP_OPENING.min, PROJECTION_TOP_OPENING.max);
  EYES.forEach((point) => addEye(fittings, point));
  TOP_BOLT_ROWS.zs.forEach((z) =>
    studRow(fittings, TOP, [TOP_BOLT_ROWS.from, z], [TOP_BOLT_ROWS.to, z], 0),
  );
  studRow(fittings, TOP, [END_BOLT_ROW.x, END_BOLT_ROW.from], [END_BOLT_ROW.x, END_BOLT_ROW.to], 0);
}

function addInterior(solid: Bin): void {
  lining(solid, BACK, spanOf(min, max, BACK));
  lining(solid, START, spanOf(min, max, START));
  lining(solid, END, spanOf(min, max, END));
  lining(solid, TOP, spanOf(min, max, TOP), TOP_HOLE);
  lining(solid, BOTTOM, spanOf(min, max, BOTTOM), BOTTOM_HOLE);
}

export function* buildProjection(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup(PART);
  const solid = new Bin();
  const front = new Bin();
  const fittings = new Bin();
  addShell(front, solid, fittings);
  addInterior(solid);
  addPosts(fittings, min, max, POST_M);
  addTopFittings(fittings);
  yield;
  addBack(fittings);
  yield;
  const set = mirrorSet(context, {
    group: PART,
    ids: MIRRORS,
    parent: root,
    bracketBin: fittings,
    wallZ: min[2] + SKIN_M + LINER_M,
    sizeOf: (id) => mirrorSizeM(id, 'na033'),
  });
  const cutaway = new Cutaway();
  const ghost = context.materials.get(PART, FINISHES.ghost);
  const fronts = front.build(context, PART, root);
  fronts.forEach((target) => cutaway.add(target, ghost));
  const iris = mesh(
    context,
    ring('y', [0, 0, 0], IRIS.inner, IRIS.outer, IRIS.thickness),
    PART,
    'flange',
  );
  iris.position.set(BOTTOM_OPENING.x, min[1] + IRIS.thickness / 2, BOTTOM_OPENING.z);
  root.add(iris);
  const covers = [
    ...fronts,
    ...solid.build(context, PART, root),
    ...fittings.build(context, STRUCTURE_GROUP, root),
    ...set.meshes,
    iris,
  ];
  label(context, PART, root, [(min[0] + max[0]) / 2, max[1] + LABEL_LIFT_M, max[2]]);
  yield;
  let ease: Ease | undefined;
  const apply = (diameter: number) => {
    set.resize('p6', diameter);
    const scale = (diameter / IRIS.baseDiameter) * IRIS_SEGMENT_SCALE;
    iris.scale.set(scale, 1, scale);
  };
  return {
    root,
    covers,
    setState(state: AssemblyState) {
      cutaway.set(state.view.cutaway);
      const target = mirrorSizeM('p6', state.optics);
      if (!ease) {
        ease = new Ease(target);
        apply(target);
      }
      ease.aim(target);
    },
    animate(frame: Frame) {
      if (!ease?.running) return false;
      ease.step(frame.delta);
      apply(ease.value);
      return ease.running;
    },
  };
}

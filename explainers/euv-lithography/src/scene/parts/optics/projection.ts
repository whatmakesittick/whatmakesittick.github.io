import type { Steps } from '@core/scene/pacing';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { AssemblyState, Point } from '../../../ids';
import { mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { label, mesh, namedGroup } from '../context';
import type { Frame, PartContext } from '../context';
import { Cutaway, Ease } from '../kit';
import {
  BOTTOM_OPENING,
  BEAM_M,
  IRIS,
  PROJECTION,
  PROJECTION_SIDE_M,
  PROJECTION_TOP_OPENING,
  PROJECTION_WALL_M,
  PROJECTION_WINDOW,
  VENEER_M,
} from './dims';
import { Bin, plate, ring, slab } from './geo';
import type { Axis, Cell, Hole } from './geo';
import { mirrorSet } from './mirror';
import type { OpticsModule } from './module';
import { frameBeams } from './skin';
import { addBack } from './projectionBack';
import { addSupports } from './projectionSupport';

const PART = 'projection';
const MIRRORS: readonly WaypointId[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const RIM_M = 0.012;
const COLLAR_M = 0.03;
const COLLAR_PROUD_M = 0.02;
const ACCENT_M = 0.03;
const LABEL_LIFT_M = 0.02;
const WINDOW_THICKNESS_M = 0.004;
const IRIS_SEGMENT_SCALE = 1;

const { min, max } = PROJECTION;
const SIDE_Y: [number, number] = [min[1] + PROJECTION_WALL_M, max[1] - PROJECTION_WALL_M];
const BACK_Z = min[2] + PROJECTION_WALL_M;
const FRONT_Z = max[2] - PROJECTION_WALL_M;

function layered(bin: Bin, axis: Axis, lo: Point, hi: Point, inward: 1 | -1, hole?: Hole): void {
  const index = { x: 0, y: 1, z: 2 }[axis];
  bin.add('shell', plate(axis, lo, hi, hole));
  const veneerLo: Cell = [...lo];
  const veneerHi: Cell = [...hi];
  if (inward > 0) {
    veneerLo[index] = hi[index];
    veneerHi[index] = hi[index] + VENEER_M;
  } else {
    veneerLo[index] = lo[index] - VENEER_M;
    veneerHi[index] = lo[index];
  }
  bin.add('shellInner', plate(axis, veneerLo, veneerHi, hole));
}

function addSolid(solid: Bin): void {
  layered(solid, 'z', [min[0], SIDE_Y[0], min[2]], [max[0], SIDE_Y[1], BACK_Z], 1);
  const opening = PROJECTION_TOP_OPENING;
  const topHole = {
    min: [opening.min[0], 0, opening.min[2]] as Point,
    max: [opening.max[0], 0, opening.max[2]] as Point,
  };
  layered(solid, 'y', [min[0], SIDE_Y[1], min[2]], max, -1, topHole);
  layered(solid, 'y', min, [max[0], SIDE_Y[0], max[2]], 1, {
    centre: [BOTTOM_OPENING.x, 0, BOTTOM_OPENING.z],
    radius: BOTTOM_OPENING.radius,
  });
  const ends: [number, number, 1 | -1][] = [
    [min[0], min[0] + PROJECTION_SIDE_M, 1],
    [max[0] - PROJECTION_SIDE_M, max[0], -1],
  ];
  ends.forEach(([from, to, inward]) =>
    layered(solid, 'x', [from, SIDE_Y[0], BACK_Z], [to, SIDE_Y[1], 0], inward),
  );
  addTopCollar(solid);
  const view = PROJECTION_WINDOW;
  solid.add(
    'accent',
    slab(
      [min[0] + 0.1, view.max[1] + 0.03, max[2] - 0.01],
      [max[0] - 0.1, view.max[1] + 0.03 + ACCENT_M, max[2] + 0.006],
    ),
  );
}

function addTopCollar(solid: Bin): void {
  const { min: lo, max: hi } = PROJECTION_TOP_OPENING;
  const top = max[1];
  const lift = top + COLLAR_PROUD_M;
  solid.add(
    'flange',
    slab([lo[0] - COLLAR_M, top, lo[2] - COLLAR_M], [lo[0], lift, hi[2] + COLLAR_M]),
    slab([hi[0], top, lo[2] - COLLAR_M], [hi[0] + COLLAR_M, lift, hi[2] + COLLAR_M]),
    slab([lo[0], top, lo[2] - COLLAR_M], [hi[0], lift, lo[2]]),
    slab([lo[0], top, hi[2]], [hi[0], lift, hi[2] + COLLAR_M]),
  );
}

function addFront(front: Bin, glass: Bin, solid: Bin): void {
  const view = PROJECTION_WINDOW;
  const [bottom, top] = SIDE_Y;
  const strips: [Point, Point][] = [
    [
      [min[0], bottom, FRONT_Z],
      [max[0], view.min[1], max[2]],
    ],
    [
      [min[0], view.max[1], FRONT_Z],
      [max[0], top, max[2]],
    ],
    [
      [min[0], view.min[1], FRONT_Z],
      [view.min[0], view.max[1], max[2]],
    ],
    [
      [view.max[0], view.min[1], FRONT_Z],
      [max[0], view.max[1], max[2]],
    ],
  ];
  strips.forEach(([lo, hi]) => layered(front, 'z', lo, hi, -1));
  const ends: [number, number, 1 | -1][] = [
    [min[0], min[0] + PROJECTION_SIDE_M, 1],
    [max[0] - PROJECTION_SIDE_M, max[0], -1],
  ];
  ends.forEach(([from, to, inward]) =>
    layered(front, 'x', [from, bottom, 0], [to, top, FRONT_Z], inward),
  );
  glass.add(
    'window',
    slab(
      [view.min[0], view.min[1], max[2] - WINDOW_THICKNESS_M],
      [view.max[0], view.max[1], max[2]],
    ),
  );
  solid.add('flange', ...viewportRim(view.min, view.max));
  solid.add(
    'flange',
    ...ends.map(([from, to]) => slab([from, bottom, -RIM_M / 2], [to, top, RIM_M / 2])),
  );
}

function viewportRim(lo: Point, hi: Point) {
  const [back, front] = [max[2] - 0.015, max[2] + 0.012];
  return [
    slab([lo[0] - RIM_M, lo[1] - RIM_M, back], [hi[0] + RIM_M, lo[1], front]),
    slab([lo[0] - RIM_M, hi[1], back], [hi[0] + RIM_M, hi[1] + RIM_M, front]),
    slab([lo[0] - RIM_M, lo[1], back], [lo[0], hi[1], front]),
    slab([hi[0], lo[1], back], [hi[0] + RIM_M, hi[1], front]),
  ];
}

export function* buildProjection(context: PartContext): Steps<OpticsModule> {
  const root = namedGroup(PART);
  const solid = new Bin();
  const front = new Bin();
  const glass = new Bin();
  const structure = new Bin();
  addSolid(solid);
  addFront(front, glass, solid);
  frameBeams(structure, min, max, BEAM_M);
  yield;
  addBack(structure);
  yield;
  addSupports(structure);
  yield;
  const set = mirrorSet(context, {
    group: PART,
    ids: MIRRORS,
    parent: root,
    bracketBin: structure,
    wallZ: BACK_Z,
    sizeOf: (id) => mirrorSizeM(id, 'na033'),
  });
  const cutaway = new Cutaway();
  const ghost = context.materials.get(PART, FINISHES.ghost);
  front.build(context, PART, root).forEach((target) => cutaway.add(target, ghost));
  solid.build(context, PART, root);
  glass.build(context, PART, root);
  structure.build(context, STRUCTURE_GROUP, root);
  const iris = mesh(
    context,
    ring('y', [0, 0, 0], IRIS.inner, IRIS.outer, IRIS.thickness),
    PART,
    'flange',
  );
  iris.position.set(BOTTOM_OPENING.x, min[1] - IRIS.thickness / 2, BOTTOM_OPENING.z);
  root.add(iris);
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

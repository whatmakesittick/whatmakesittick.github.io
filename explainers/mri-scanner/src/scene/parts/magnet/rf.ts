import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Group } from 'three';
import { BODY_COIL, BORE } from '../../../model/layout';
import { rectLoop } from '../../geometry/profile';
import { sweepProfile } from '../../geometry/sweep';
import type { Arc } from '../../geometry/sweep';
import { instanced, mergeParts } from '../context';
import type { PartContext } from '../context';
import { BORE_JOINTS } from './cover';
import { addMeshes, boreGroup, isInWedge, REST_ARC, WEDGE_ARC } from './cutaway';
import { BODY_COIL_CUT_FINISH, CAPACITOR_FINISH, COPPER_FINISH, LINER_FINISH } from './looks';
import { slice } from './slice';

const SEGMENTS = 112;
const RUNG_SIDES = 10;
const END_RING = { width: 0.025, thickness: 0.008 } as const;
const CAPACITOR = { width: 0.022, height: 0.012, length: 0.016 } as const;
const BODY_COIL_BAND = 0.016;
const LINER_WALL = 0.006;
const LINER_TUCK = 0.01;
const UNIT = new Vector3(1, 1, 1);

function rungAngles(offset: number): number[] {
  const step = (2 * Math.PI) / BODY_COIL.rungs;
  return Array.from({ length: BODY_COIL.rungs }, (_, index) => (index + offset) * step).filter(
    (angle) => !isInWedge(angle),
  );
}

function placed(angle: number, radius: number, z: number): Matrix4 {
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle - Math.PI / 2);
  return new Matrix4().compose(
    new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), z),
    turn,
    UNIT,
  );
}

function bodyCoilSlice(): BufferGeometry {
  const { radius, halfLength } = BODY_COIL;
  const half = BODY_COIL_BAND / 2;
  const reach = halfLength + END_RING.width / 2;
  return slice(
    { outer: rectLoop(radius - half, radius + half, -reach, reach), holes: [] },
    'bodyCoil',
  );
}

function endRings(): BufferGeometry {
  const { radius, halfLength } = BODY_COIL;
  const half = END_RING.thickness / 2;
  return mergeParts(
    [-1, 1].map((side) => {
      const edge = side * halfLength;
      const loop = rectLoop(
        radius - half,
        radius + half,
        edge - END_RING.width / 2,
        edge + END_RING.width / 2,
      );
      return sweepProfile({ outer: loop, holes: [] }, { arc: REST_ARC, segmentsPerTurn: SEGMENTS });
    }),
  );
}

export function buildBodyCoil(context: PartContext): Group {
  const group = boreGroup('bodyCoil');
  const { radius, halfLength, rungRadius } = BODY_COIL;
  const rung = new CylinderGeometry(rungRadius, rungRadius, 2 * halfLength, RUNG_SIDES).rotateX(
    Math.PI / 2,
  );
  const capacitor = new BoxGeometry(CAPACITOR.width, CAPACITOR.height, CAPACITOR.length);
  const capRadius = radius + (END_RING.thickness + CAPACITOR.height) / 2;
  const capacitors = rungAngles(1).flatMap((angle) =>
    [-halfLength, halfLength].map((z) => placed(angle, capRadius, z)),
  );
  addMeshes(context, group, 'bodyCoil', COPPER_FINISH, [endRings()]);
  addMeshes(context, group, 'bodyCoil', BODY_COIL_CUT_FINISH, [bodyCoilSlice()]);
  group.add(
    instanced(
      context,
      rung,
      'bodyCoil',
      COPPER_FINISH,
      rungAngles(0.5).map((angle) => placed(angle, radius, 0)),
    ),
    instanced(context, capacitor, 'bodyCoil', CAPACITOR_FINISH, capacitors),
  );
  return group;
}

function linerGeometry(arc: Arc): BufferGeometry {
  const loop = rectLoop(
    BORE.radius - LINER_WALL,
    BORE.radius,
    BORE_JOINTS.back - LINER_TUCK,
    BORE_JOINTS.front + LINER_TUCK,
  );
  return sweepProfile({ outer: loop, holes: [] }, { arc, segmentsPerTurn: SEGMENTS });
}

export interface BoreLiner {
  group: Group;
  wedge: Group;
}

export function buildBoreLiner(context: PartContext): BoreLiner {
  const group = boreGroup('bore');
  addMeshes(context, group, 'bore', LINER_FINISH, [linerGeometry(REST_ARC)]);
  const wedge = boreGroup('boreWedge');
  wedge.position.set(0, 0, 0);
  addMeshes(context, wedge, 'bore', LINER_FINISH, [linerGeometry(WEDGE_ARC)]);
  group.add(wedge);
  return { group, wedge };
}

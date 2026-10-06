import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { COLD_HEAD, FLOOR_Y, ISOCENTRE, MAGNET, QUENCH_PIPE } from '../../../model/layout';
import { addMeshes } from './cutaway';
import type { PartContext } from '../context';
import { HOSE_FINISH, PIPE_FINISH, TURRET_FINISH } from './looks';

const LATHE_SEGMENTS = 48;
const COVER_TOP = ISOCENTRE[1] + MAGNET.radius;
const NECK_RADIUS = 0.1;
const COLLAR = { radius: 0.19, height: 0.04 } as const;
const RIB = { depth: 0.012, pitch: 0.025 } as const;
const CAP = { radius: 0.18, height: 0.03 } as const;
const MOTOR = { radius: 0.05, height: 0.16, offset: 0.115 } as const;
const HOSE = { radius: 0.018, spacing: 0.05, tubular: 64, radial: 8 } as const;
const HOSE_ROUTE = {
  lift: 0.08,
  pullBack: 0.15,
  rimGap: 0.01,
  backGap: 0.05,
  rimDegrees: [100, 135, 165],
  dropHeight: 0.6,
  knee: { height: 0.14, reach: 0.1 },
  floorRun: 0.3,
  sink: { depth: 0.06, reach: 0.12 },
} as const;
const PIPE_FLANGE = { radius: 0.085, height: 0.02 } as const;
const BELLOWS = { from: 0.12, to: 0.28, depth: 0.012, pitch: 0.016 } as const;
const CEILING_FLANGE = { radius: 0.12, height: 0.02 } as const;

function ribs(radius: number, depth: number, from: number, to: number, pitch: number): Vector2[] {
  const count = Math.floor((to - from) / pitch);
  return Array.from({ length: count }, (_, index) => {
    const y = from + index * pitch;
    return [
      new Vector2(radius, y),
      new Vector2(radius + depth, y + pitch * 0.2),
      new Vector2(radius + depth, y + pitch * 0.6),
      new Vector2(radius, y + pitch * 0.8),
    ];
  }).flat();
}

function turretProfile(): Vector2[] {
  const foot = 2 * COLD_HEAD.centre[1] - COLD_HEAD.top;
  const shoulder = COVER_TOP - COLLAR.height / 2;
  const capFoot = COLD_HEAD.top - CAP.height;
  return [
    new Vector2(0, foot),
    new Vector2(NECK_RADIUS, foot),
    new Vector2(NECK_RADIUS, shoulder),
    new Vector2(COLLAR.radius, shoulder),
    new Vector2(COLLAR.radius, shoulder + COLLAR.height),
    new Vector2(COLD_HEAD.radius, shoulder + COLLAR.height),
    ...ribs(COLD_HEAD.radius, RIB.depth, shoulder + COLLAR.height, capFoot, RIB.pitch),
    new Vector2(CAP.radius, capFoot),
    new Vector2(CAP.radius, COLD_HEAD.top),
    new Vector2(0, COLD_HEAD.top),
  ];
}

function pipeProfile(): Vector2[] {
  const { from, to, radius } = QUENCH_PIPE;
  return [
    new Vector2(0, from),
    new Vector2(PIPE_FLANGE.radius, from),
    new Vector2(PIPE_FLANGE.radius, from + PIPE_FLANGE.height),
    new Vector2(radius, from + PIPE_FLANGE.height),
    ...ribs(radius, BELLOWS.depth, from + BELLOWS.from, from + BELLOWS.to, BELLOWS.pitch),
    new Vector2(radius, to - CEILING_FLANGE.height),
    new Vector2(CEILING_FLANGE.radius, to - CEILING_FLANGE.height),
    new Vector2(CEILING_FLANGE.radius, to),
    new Vector2(0, to),
  ];
}

function hoseRoute(offset: number): Vector3[] {
  const start = new Vector3(
    COLD_HEAD.centre[0] + MOTOR.offset + offset,
    COLD_HEAD.top + MOTOR.height,
    COLD_HEAD.centre[2],
  );
  const rim = MAGNET.radius + HOSE.radius + HOSE_ROUTE.rimGap + offset;
  const back = -(MAGNET.halfLength + HOSE.radius + HOSE_ROUTE.backGap);
  const floor = FLOOR_Y + HOSE.radius;
  const { knee, sink } = HOSE_ROUTE;
  const kneeZ = back - knee.reach;
  const runEnd = back - HOSE_ROUTE.floorRun;
  const onRim = (degrees: number) => {
    const angle = MathUtils.degToRad(degrees);
    return new Vector3(rim * Math.cos(angle), ISOCENTRE[1] + rim * Math.sin(angle), back);
  };
  return [
    start,
    start.clone().add(new Vector3(0, HOSE_ROUTE.lift, -HOSE_ROUTE.pullBack)),
    ...HOSE_ROUTE.rimDegrees.map(onRim),
    new Vector3(-rim, HOSE_ROUTE.dropHeight, back),
    new Vector3(-rim, floor + knee.height, kneeZ),
    new Vector3(-rim, floor, kneeZ - knee.reach),
    new Vector3(-rim, floor, runEnd),
    new Vector3(-rim, FLOOR_Y - sink.depth, runEnd - sink.reach),
  ];
}

function hoses(origin: Vector3): BufferGeometry[] {
  return [-1, 1].map((side) => {
    const route = hoseRoute((side * HOSE.spacing) / 2).map((point) => point.sub(origin));
    const curve = new CatmullRomCurve3(route, false, 'centripetal');
    return new TubeGeometry(curve, HOSE.tubular, HOSE.radius, HOSE.radial);
  });
}

function placedGroup(name: string): Group {
  const group = new Group();
  group.name = name;
  group.position.set(COLD_HEAD.centre[0], 0, COLD_HEAD.centre[2]);
  return group;
}

export function buildColdHead(context: PartContext): Group {
  const group = placedGroup('coldHead');
  const motor = new CylinderGeometry(
    MOTOR.radius,
    MOTOR.radius,
    MOTOR.height,
    LATHE_SEGMENTS / 2,
  ).translate(MOTOR.offset, COLD_HEAD.top + MOTOR.height / 2, 0);
  addMeshes(context, group, 'coldHead', TURRET_FINISH, [
    new LatheGeometry(turretProfile(), LATHE_SEGMENTS),
    motor,
  ]);
  addMeshes(context, group, 'coldHead', HOSE_FINISH, hoses(group.position));
  return group;
}

export function buildQuenchPipe(context: PartContext): Group {
  const group = placedGroup('quenchPipe');
  addMeshes(context, group, 'quenchPipe', PIPE_FINISH, [
    new LatheGeometry(pipeProfile(), LATHE_SEGMENTS),
  ]);
  return group;
}

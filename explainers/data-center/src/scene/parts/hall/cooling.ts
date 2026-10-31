import { BoxGeometry, Matrix4, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import type { Point } from '../../../ids';
import {
  ANCHOR_POINTS,
  CDU,
  CDUS,
  CEILING_Y,
  RACK,
  RISER,
  ROWS,
  ROW_PIPE,
  SUBJECT_CDU,
  SUBJECT_ROW,
  SUBJECT_ROW_INDEX,
  behind,
  boxTop,
} from '../../../model';
import type { RowSpec } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { CHANNEL_Y, hungFromCeiling } from './ceiling';
import type { CeilingGrid } from './ceiling';
import { instances } from './instances';
import { MANIFOLD_LOCAL, SUPPLY_PIPE_OFFSET } from './racks';
import { facingPlacement, rodBetween, rodGeometry } from './shapes';
import { cduFrontTexture } from './textures';

const ROW_PIPE_R = 0.045;
const PIPE_SIDES = 10;
const ELBOW_DETAIL = { near: [PIPE_SIDES, 6], far: [8, 4] } as const;
const STRUT_SIDES = 4;
const SUPPLY_TAIL_M = 0.035;
const RISER_R = 0.06;
const JACKET_R = 0.072;
const BAND_R = 0.075;
const BAND_M = 0.08;
const DROP_SHIFT = CDU.width / 4;
const SUPPLY_DROP_Z = 0.3;
const SUPPLY_RISER_Z = 0.16;
const JACKET_FROM = 2.45;
const BAND_PITCH = 1.2;
const SUPPORT_PITCH = 2.4;
const STRUT = { wide: 0.04, reach: 0.12, hanger: 0.008 } as const;
const VALVE = { body: 0.11, stem: 0.07, wheel: 0.06 } as const;
const SCREEN: Point = [0.157, 1.6, 0.2];
const SCREEN_SIZE: Point = [0.2, 0.13, 0.004];
const FACILITY_GROUP = 'facilityPipes';
const HEADER_Y = CEILING_Y;
const MAIN_Y = CEILING_Y - 0.25;
const HEADER_OFFSET_M = 0.2;
const TRAPEZE_X = [-1.2, 1.8, 4.8, 7.8, 10.8, 14.4, 17.1] as const;
const LINES = ['supply', 'ret'] as const;
const SIDE: Record<Line, number> = { supply: -1, ret: 1 };
const TOLERANCE_M = 1e-6;

type Line = (typeof LINES)[number];

interface Pipe {
  from: Point;
  to: Point;
  radius: number;
}

function pipe(from: Point, to: Point, radius = ROW_PIPE_R): Pipe {
  return { from, to, radius };
}

function rowEnds(row: RowSpec): { west: number; cduX: number } {
  return { west: row.startX + RACK.width / 2, cduX: CDUS[row.index].base[0] };
}

function rowPipes(row: RowSpec): { supply: Point[]; ret: Point[] } {
  const { west, cduX } = rowEnds(row);
  const y = ROW_PIPE.y;
  const returnZ = behind(row, MANIFOLD_LOCAL.z);
  const supplyZ = behind(row, MANIFOLD_LOCAL.z + SUPPLY_PIPE_OFFSET);
  const supplyWest = west - MANIFOLD_LOCAL.x;
  const returnX = cduX - DROP_SHIFT;
  const supplyX = cduX + DROP_SHIFT;
  return {
    ret: [
      [west, y, returnZ],
      [returnX, y, returnZ],
      [returnX, CDU.height, returnZ],
    ],
    supply: [
      [supplyWest, y, behind(row, MANIFOLD_LOCAL.z - SUPPLY_TAIL_M)],
      [supplyWest, y, supplyZ],
      [supplyX, y, supplyZ],
      [supplyX, y, behind(row, SUPPLY_DROP_Z)],
      [supplyX, CDU.height, behind(row, SUPPLY_DROP_Z)],
    ],
  };
}

function polyline(points: readonly Point[]): Pipe[] {
  return points.slice(1).map((to, index) => pipe(points[index], to));
}

function riserZ(row: RowSpec, line: Line): number {
  return behind(row, line === 'supply' ? SUPPLY_RISER_Z : MANIFOLD_LOCAL.z);
}

function headerX(block: number, line: Line): number {
  const row = ROWS.find((spec) => spec.block === block) ?? SUBJECT_ROW;
  return CDUS[row.index].base[0] + SIDE[line] * HEADER_OFFSET_M;
}

const MAIN: Record<Line, { z: number; x: Extent }> = {
  supply: { z: riserZ(SUBJECT_ROW, 'supply'), x: [headerX(0, 'supply'), headerX(1, 'supply')] },
  ret: { z: RISER.z, x: [RISER.x, headerX(1, 'ret')] },
};

function endsOnMain(row: RowSpec, line: Line): boolean {
  const x = CDUS[row.index].base[0];
  const { z, x: span } = MAIN[line];
  return Math.abs(riserZ(row, line) - z) < TOLERANCE_M && x > span[0] && x < span[1];
}

function riserTop(row: RowSpec, line: Line): number {
  if (row.index === SUBJECT_ROW_INDEX) return RISER.top;
  return endsOnMain(row, line) ? MAIN_Y : HEADER_Y;
}

function risers(row: RowSpec): { supply: Pipe; ret: Pipe } {
  const x = CDUS[row.index].base[0];
  const [supply, ret] = LINES.map((line) => {
    const z = riserZ(row, line);
    return pipe([x, RISER.bottom, z], [x, riserTop(row, line), z], RISER_R);
  });
  return { supply, ret };
}

interface WaterLine {
  pipes: Pipe[];
  elbows: Point[];
}

function waterLine(line: Line): WaterLine {
  const main = MAIN[line];
  const headers = [0, 1].map((block) => headerX(block, line));
  const fed = ROWS.filter(
    (row) => row.index !== SUBJECT_ROW_INDEX && riserTop(row, line) === HEADER_Y,
  );
  const stubs = fed.map((row): [Point, Point] => {
    const z = riserZ(row, line);
    return [
      [CDUS[row.index].base[0], HEADER_Y, z],
      [headerX(row.block, line), HEADER_Y, z],
    ];
  });
  const runs = headers.map((x, block) => {
    const zs = [
      main.z,
      ...fed.filter((row) => row.block === block).map((row) => riserZ(row, line)),
    ];
    return [Math.min(...zs), Math.max(...zs)].map((z): Point => [x, HEADER_Y, z]);
  });
  return {
    pipes: [
      pipe([main.x[0], MAIN_Y, main.z], [main.x[1], MAIN_Y, main.z], RISER_R),
      ...headers.map((x) => pipe([x, MAIN_Y, main.z], [x, HEADER_Y, main.z], RISER_R)),
      ...runs.map(([from, to]) => pipe(from, to, RISER_R)),
      ...stubs.map(([from, to]) => pipe(from, to, RISER_R)),
    ],
    elbows: [
      ...main.x.filter((x) => headers.includes(x)).map((x): Point => [x, MAIN_Y, main.z]),
      ...runs.flat(),
      ...stubs.map(([from]) => from),
    ],
  };
}

function mainSupports(grid: CeilingGrid): { struts: Matrix4[]; hangers: Matrix4[] } {
  const zs = LINES.map((line) => MAIN[line].z);
  const north = Math.max(...grid.lines.filter((z) => z < Math.min(...zs) - RISER_R));
  const south = Math.min(...grid.lines.filter((z) => z > Math.max(...zs) + RISER_R));
  const barY = MAIN_Y - RISER_R - STRUT.wide / 2;
  const headerHangers = LINES.flatMap((line) =>
    [0, 1].flatMap((block) => {
      const x = headerX(block, line);
      const zs = ROWS.filter((row) => row.block === block).map((row) => riserZ(row, line));
      return grid
        .hangers(Math.min(...zs), Math.max(...zs))
        .map((z) => rodBetween([x, HEADER_Y + RISER_R, z], [x, CHANNEL_Y, z], STRUT.hanger));
    }),
  );
  return {
    struts: TRAPEZE_X.map((x) => rodBetween([x, barY, north], [x, barY, south], STRUT.wide)),
    hangers: [
      ...headerHangers,
      ...TRAPEZE_X.flatMap((x) =>
        [north, south].map((z) => rodBetween([x, barY, z], [x, CHANNEL_Y, z], STRUT.hanger)),
      ),
    ],
  };
}

export function coolingLines(): number[] {
  return ROWS.map((row) => behind(row, MANIFOLD_LOCAL.z + SUPPLY_PIPE_OFFSET + STRUT.reach / 2));
}

function jackets(riser: Pipe): { jacket: Matrix4; bands: Matrix4[] } {
  const [x, , z] = riser.from;
  const top = riser.to[1];
  const count = Math.floor((top - JACKET_FROM) / BAND_PITCH);
  return {
    jacket: rodBetween([x, JACKET_FROM, z], [x, top, z], JACKET_R),
    bands: Array.from({ length: count }, (_, index) => {
      const y = JACKET_FROM + (index + 0.5) * BAND_PITCH;
      return rodBetween([x, y, z], [x, y + BAND_M, z], BAND_R);
    }),
  };
}

function supports(row: RowSpec): { struts: Matrix4[]; hangers: Matrix4[] } {
  const { west, cduX } = rowEnds(row);
  const nearZ = behind(row, MANIFOLD_LOCAL.z - STRUT.reach / 2);
  const farZ = behind(row, MANIFOLD_LOCAL.z + SUPPLY_PIPE_OFFSET + STRUT.reach / 2);
  const strutY = ROW_PIPE.y - ROW_PIPE_R - STRUT.wide / 2;
  const count = Math.floor((cduX - west) / SUPPORT_PITCH);
  const xs = Array.from({ length: count }, (_, index) => west + (index + 0.5) * SUPPORT_PITCH);
  return {
    struts: xs.map((x) => rodBetween([x, strutY, nearZ], [x, strutY, farZ], STRUT.wide)),
    hangers: xs.map((x) => rodBetween([x, strutY, farZ], [x, CHANNEL_Y, farZ], STRUT.hanger)),
  };
}

function valves(row: RowSpec): { bodies: Matrix4[]; wheels: Matrix4[] } {
  const { cduX } = rowEnds(row);
  const y = ROW_PIPE.y;
  const at = (x: number, z: number) => ({
    body: rodBetween([x - VALVE.body / 2, y, z], [x + VALVE.body / 2, y, z], ROW_PIPE_R * 1.35),
    wheel: rodBetween(
      [x, y + ROW_PIPE_R + VALVE.stem, z],
      [x, y + ROW_PIPE_R + VALVE.stem + 0.012, z],
      VALVE.wheel,
    ),
  });
  const x = cduX - CDU.width / 2 - 0.25;
  const pair = [
    at(x, behind(row, MANIFOLD_LOCAL.z)),
    at(x, behind(row, MANIFOLD_LOCAL.z + SUPPLY_PIPE_OFFSET)),
  ];
  return { bodies: pair.map((valve) => valve.body), wheels: pair.map((valve) => valve.wheel) };
}

function cduBodies(context: PartContext, group: Group) {
  const geometry = new BoxGeometry(CDU.width, CDU.height, CDU.depth).translate(
    0,
    CDU.height / 2,
    0,
  );
  const side = context.materials.get('cdu', FINISHES.steelLight);
  const front = registeredMaterial(
    context,
    'cdu',
    new MeshStandardMaterial({
      map: context.tracker.track(cduFrontTexture()),
      roughness: 0.5,
      metalness: 0.2,
    }),
  );
  const placements = ROWS.map((row) => facingPlacement(CDUS[row.index].base, row.facing));
  group.add(instances(context, geometry, [side, side, side, side, side, front], placements));
  const screen = registeredMaterial(
    context,
    'cdu',
    new MeshStandardMaterial({ color: '#0c2a2a', emissive: '#4fd6c4', emissiveIntensity: 0.9 }),
  );
  const offset = new Matrix4()
    .makeTranslation(SCREEN[0], SCREEN[1], -CDU.depth / 2 - SCREEN_SIZE[2] / 2)
    .multiply(new Matrix4().makeScale(...SCREEN_SIZE));
  group.add(
    instances(
      context,
      new BoxGeometry(),
      screen,
      placements.map((placement) => placement.clone().multiply(offset)),
    ),
  );
}

export function buildCdus(context: PartContext, parent: Group, grid: CeilingGrid): Group {
  const group = namedGroup('cdu', parent);
  cduBodies(context, group);
  label(context, 'cdu', group, boxTop(SUBJECT_CDU));
  sceneAnchor(context, 'cdu', group, ANCHOR_POINTS.cdu);
  const pipes = namedGroup('rowPipes', group);
  const supply: Pipe[] = [];
  const ret: Pipe[] = [];
  const jacketed: Matrix4[] = [];
  const bands: { supply: Matrix4[]; ret: Matrix4[] } = { supply: [], ret: [] };
  const struts: Matrix4[] = [];
  const hangers: Matrix4[] = [];
  const valveParts: { bodies: Matrix4[]; wheels: Matrix4[] } = { bodies: [], wheels: [] };
  const elbows = {
    near: { supply: [] as Matrix4[], ret: [] as Matrix4[] },
    far: { supply: [] as Matrix4[], ret: [] as Matrix4[] },
  };
  const balls = (points: Point[], radius = ROW_PIPE_R) =>
    points.map((point) =>
      new Matrix4().makeTranslation(...point).scale(new Vector3().setScalar(radius)),
    );
  ROWS.forEach((row) => {
    const rowRun = rowPipes(row);
    const riser = risers(row);
    const subject = row.index === SUBJECT_ROW_INDEX;
    supply.push(...polyline(rowRun.supply), riser.supply);
    ret.push(...polyline(rowRun.ret), riser.ret);
    const bends = subject ? elbows.near : elbows.far;
    bends.supply.push(...balls(rowRun.supply.slice(1, -1)));
    bends.ret.push(...balls(rowRun.ret.slice(1, -1)));
    if (subject) {
      const supplyJacket = jackets(riser.supply);
      const returnJacket = jackets(riser.ret);
      jacketed.push(supplyJacket.jacket, returnJacket.jacket);
      bands.supply.push(...supplyJacket.bands);
      bands.ret.push(...returnJacket.bands);
    }
    const rowSupports = supports(row);
    struts.push(...rowSupports.struts);
    hangers.push(...rowSupports.hangers);
    const rowValves = valves(row);
    valveParts.bodies.push(...rowValves.bodies);
    valveParts.wheels.push(...rowValves.wheels);
  });
  const water = { supply: waterLine('supply'), ret: waterLine('ret') };
  LINES.forEach((line) => {
    (line === 'supply' ? supply : ret).push(...water[line].pipes);
    elbows.far[line].push(...balls(water[line].elbows, RISER_R));
  });
  const mains = mainSupports(grid);
  struts.push(...mains.struts);
  hangers.push(...mains.hangers);
  const add = (
    finish: keyof typeof FINISHES,
    matrices: Matrix4[],
    geometry = rodGeometry(PIPE_SIDES),
  ) =>
    pipes.add(
      instances(
        context,
        geometry,
        context.materials.get(FACILITY_GROUP, FINISHES[finish]),
        matrices,
      ),
    );
  const matrices = (list: Pipe[]) =>
    list.map(({ from, to, radius }) => rodBetween(from, to, radius));
  add('pipeSupply', [...matrices(supply), ...bands.supply]);
  add('pipeReturn', [...matrices(ret), ...bands.ret]);
  (['near', 'far'] as const).forEach((range) => {
    const [sides, rings] = ELBOW_DETAIL[range];
    add('pipeSupply', elbows[range].supply, new SphereGeometry(1, sides, rings));
    add('pipeReturn', elbows[range].ret, new SphereGeometry(1, sides, rings));
  });
  add('pipeInsulated', jacketed);
  add('steelDark', [...struts, ...valveParts.bodies], rodGeometry(STRUT_SIDES));
  pipes.add(
    hungFromCeiling(
      instances(
        context,
        rodGeometry(3, true),
        context.materials.get(FACILITY_GROUP, FINISHES.steelDark),
        hangers,
      ),
    ),
  );
  add('steel', valveParts.wheels);
  return group;
}

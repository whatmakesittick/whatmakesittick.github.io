import { Matrix4, TorusGeometry, Vector3 } from 'three';
import type { Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import type { CoolingId, Point } from '../../../ids';
import type { BoxSpec } from '../../../model';
import { AIR_HANDLERS, CHILLER, DRY_COOLERS, DRY_COOLER_ROW_Z } from '../../../model';
import { ROOF_PIPE_Y as Y, ROOF_Y, WALL_PIPE_X, boxSpan, legsFor } from '../../../model';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { CHILLER_BARREL } from './chiller';
import { INNER_WALL, PAD_TOP_Y } from './constants';
import { DUNNAGE_TOP_Y, PIPE_R, at, drawer, dunnage, onSteel, rod, spread } from './pipeKit';

type Network = 'always' | CoolingId;

const BEND_R = 0.35;
const ELBOW = { tube: 10, arc: 8 } as const;
const BAND = { radius: 0.163, length: 0.06, pitch: 1.8 } as const;
const STAND = { pitch: 3, minRun: 2.6, plate: 0.16, plateM: 0.04, post: 0.04 } as const;
const SADDLE = { across: 0.19, along: 0.06, height: 0.06 } as const;
const CURB = { half: 0.28, reach: 0.6, height: 0.14 } as const;
const STUB_DEPTH_M = 0.2;
const OVERRUN_M = 0.4;
const JOIN_M = 0.02;
const LEVEL_EPSILON = 1e-6;

const [riser, riserBend, riserNorth, , headerTurn, corner] = legsFor('liquid', 'release')[0].points;
const [wallTop, wallBend, northCorner, westCorner] = legsFor('air', 'release')[0].points;
const wallFoot = legsFor('air', 'cool')[1].points[1];
const [CHILLER_Z, HEADER_Z] = [riserNorth[2], corner[2]];
const [NORTH_Z, SOUTH_Z] = DRY_COOLER_ROW_Z;
const BRANCH_X = DRY_COOLERS.filter(({ base }) => base[2] === NORTH_Z).map(({ base }) => base[0]);
const HANDLER_Z = AIR_HANDLERS.map(({ base }) => base[2]);
const level = (x: number, z: number, y = Y): Point => [x, y, z];

const STUB_FOOT = level(riser[0], riser[2], ROOF_Y - STUB_DEPTH_M);
const LIQUID_END = level(boxSpan(CHILLER).x[0] + JOIN_M, CHILLER_Z);
const CHILLER_EXIT = level(CHILLER_BARREL.east - JOIN_M, CHILLER_Z);
const HEADER_END = level(Math.max(...BRANCH_X) + OVERRUN_M, HEADER_Z);
const AIR_END = level(westCorner[0], CHILLER_BARREL.north + JOIN_M);
const COLLECTOR_Z = [Math.min(...HANDLER_Z) - OVERRUN_M, Math.max(...HANDLER_Z) + OVERRUN_M];

const ROUTES: Readonly<Record<Network, readonly (readonly Point[])[]>> = {
  always: [
    [CHILLER_EXIT, headerTurn, corner, HEADER_END],
    ...BRANCH_X.map((x) => [level(x, NORTH_Z), level(x, SOUTH_Z)]),
  ],
  liquid: [[STUB_FOOT, riserBend, riserNorth, LIQUID_END]],
  air: [
    [wallFoot, wallBend, northCorner, westCorner, AIR_END],
    COLLECTOR_Z.map((z) => level(WALL_PIPE_X, z, wallFoot[1])),
  ],
};

const CURBS: Readonly<Record<Network, readonly BoxSpec[]>> = {
  always: [],
  liquid: [at(riser, [-CURB.half, CURB.half, 0, CURB.height, -CURB.reach, CURB.half])],
  air: [
    at(wallTop, [-CURB.half, INNER_WALL.east - WALL_PIPE_X, 0, CURB.height, -CURB.half, CURB.half]),
  ],
};

export const PIPE_LABEL = level((headerTurn[0] + Math.min(...BRANCH_X)) / 2, HEADER_Z, Y + PIPE_R);

function bend(corner: Vector3, incoming: Vector3, outgoing: Vector3): Matrix4 {
  const across = outgoing.clone().negate();
  const centre = new Vector3().subVectors(outgoing, incoming).multiplyScalar(BEND_R).add(corner);
  const normal = new Vector3().crossVectors(across, incoming);
  return new Matrix4().makeBasis(across, incoming, normal).setPosition(centre);
}

function bands(from: Vector3, to: Vector3): Matrix4[] {
  const half = new Vector3().subVectors(to, from).setLength(BAND.length / 2);
  return spread(Math.floor(from.distanceTo(to) / BAND.pitch)).map((share) => {
    const centre = from.clone().lerp(to, share);
    return rod(centre.clone().sub(half), centre.clone().add(half), BAND.radius);
  });
}

function stand({ x, y, z }: Vector3, alongX: boolean): BoxSpec[] {
  const onRoof = y > ROOF_Y;
  const foot = !onRoof ? PAD_TOP_Y : onSteel(x) ? DUNNAGE_TOP_Y : ROOF_Y;
  const [top, plate] = [y - PIPE_R, foot + STAND.plateM];
  const [halfX, halfZ] = alongX ? [SADDLE.along, SADDLE.across] : [SADDLE.across, SADDLE.along];
  const parts = [
    at([x, 0, z], [-STAND.plate, STAND.plate, foot, plate, -STAND.plate, STAND.plate]),
    at([x, 0, z], [-STAND.post, STAND.post, plate, top - SADDLE.height, -STAND.post, STAND.post]),
    at([x, 0, z], [-halfX, halfX, top - SADDLE.height, top, -halfZ, halfZ]),
  ];
  return onRoof && onSteel(x) ? [...parts, dunnage(x, x, z)] : parts;
}

function stands(start: Vector3, end: Vector3): BoxSpec[] {
  const length = start.distanceTo(end);
  if (Math.abs(start.y - end.y) > LEVEL_EPSILON || length < STAND.minRun) return [];
  const alongX = Math.abs(end.x - start.x) > Math.abs(end.z - start.z);
  return spread(Math.round(length / STAND.pitch)).flatMap((share) =>
    stand(start.clone().lerp(end, share), alongX),
  );
}

function lay(network: Network) {
  const laid = { straights: [] as Matrix4[], elbows: [] as Matrix4[], bands: [] as Matrix4[] };
  const steel = [...CURBS[network]];
  ROUTES[network].forEach((route) => {
    const points = route.map((point) => new Vector3(...point));
    points.slice(1).forEach((end, index) => {
      const start = points[index];
      const direction = end.clone().sub(start).normalize();
      const next = points[index + 2];
      const from = index > 0 ? start.clone().addScaledVector(direction, BEND_R) : start;
      const to = next ? end.clone().addScaledVector(direction, -BEND_R) : end;
      laid.straights.push(rod(from, to, PIPE_R));
      laid.bands.push(...bands(from, to));
      steel.push(...stands(start, end));
      if (next) laid.elbows.push(bend(end, direction, next.clone().sub(end).normalize()));
    });
  });
  return { ...laid, steel };
}

export function buildFacilityPipes(context: PartContext, group: Object3D) {
  const elbow = new TorusGeometry(BEND_R, PIPE_R, ELBOW.tube, ELBOW.arc, FULL_TURN / 4);
  const networks = (['always', 'liquid', 'air'] as const).map((network) => {
    const parent = network === 'always' ? group : namedGroup(`${network}Pipes`, group);
    const draw = drawer(context, 'facilityPipes', parent);
    const { straights, elbows, bands: rings, steel } = lay(network);
    draw.rods('pipeInsulated', straights);
    draw.mesh(elbow, draw.look('pipeInsulated'), elbows);
    draw.rods('steelLight', rings);
    draw.boxes('steel', steel);
    return [network, parent] as const;
  });
  return (cooling: CoolingId) =>
    networks.forEach(([network, parent]) => {
      parent.visible = network === 'always' || network === cooling;
    });
}

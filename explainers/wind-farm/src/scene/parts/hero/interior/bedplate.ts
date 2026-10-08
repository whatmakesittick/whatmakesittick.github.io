import { Path } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { degrees, partMesh } from '../../context';
import type { PartContext } from '../../context';
import { DECK_Y, FLOOR_Y } from './constants';
import { TORQUE_ARM_FOOT_Y, TORQUE_ARM_X } from './gearbox';
import { arcPoints, circlePoints, merge, mirrored, SIDES, span } from './geometry';
import { SECTOR_SPAN_DEG, SECTOR_TOP } from './yawDrives';

const DECK_HALF_OUTLINE: readonly PlanPoint[] = [
  { x: 2.4, z: 1.35 },
  { x: -2.5, z: 1.35 },
  { x: -3.0, z: 1.55 },
  { x: -4.2, z: 1.55 },
  { x: -4.4, z: 1.3 },
];
const ACCESS_HOLE = { radius: 0.8, segments: 32 } as const;
const GIRDER = {
  top: 103.88,
  z: [1.15, 1.35],
  runs: [
    [-4.3, -1.6],
    [1.6, 2.4],
  ],
} as const;
const CROSS_RIBS = {
  xs: [
    [-2.75, -2.6],
    [2.25, 2.4],
  ],
  top: 103.8,
  z: 1.15,
} as const;
const SECTOR = { inner: 1.74, outer: 2.08, bottom: 103.46, segments: 14 } as const;
const PEDESTAL = { grow: 0.07, z: [1.25, 1.95] } as const;

function deck(): BufferGeometry {
  const lower = [...DECK_HALF_OUTLINE].reverse().map(({ x, z }) => ({ x, z: -z }));
  const shape = planShape([...DECK_HALF_OUTLINE, ...lower]);
  shape.holes.push(new Path(circlePoints(ACCESS_HOLE.radius, ACCESS_HOLE.segments)));
  return extrudePlan(shape, FLOOR_Y, DECK_Y);
}

function girders(): BufferGeometry[] {
  const runs = SIDES.flatMap((side) =>
    GIRDER.runs.map((run) => span(run, [DECK_Y, GIRDER.top], mirrored(GIRDER.z, side))),
  );
  const ribs = CROSS_RIBS.xs.map((x) =>
    span(x, [DECK_Y, CROSS_RIBS.top], [-CROSS_RIBS.z, CROSS_RIBS.z]),
  );
  return [...runs, ...ribs];
}

function driveSector(side: number): BufferGeometry {
  const [from, to] = SECTOR_SPAN_DEG.map((angle) => side * degrees(angle));
  const outer = arcPoints(SECTOR.outer, from, to, SECTOR.segments);
  const inner = arcPoints(SECTOR.inner, to, from, SECTOR.segments);
  const shape = planShape([...outer, ...inner].map(({ x, y }) => ({ x, z: y })));
  return extrudePlan(shape, SECTOR.bottom, SECTOR_TOP);
}

function pedestals(): BufferGeometry[] {
  const x = [TORQUE_ARM_X[0] - PEDESTAL.grow, TORQUE_ARM_X[1] + PEDESTAL.grow] as const;
  return SIDES.map((side) => span(x, [FLOOR_Y, TORQUE_ARM_FOOT_Y], mirrored(PEDESTAL.z, side)));
}

export function buildBedplate(context: PartContext, parent: Object3D): void {
  const geometry = merge([deck(), ...girders(), ...SIDES.map(driveSector), ...pedestals()]);
  parent.add(partMesh(context, geometry, 'bedplate'));
}

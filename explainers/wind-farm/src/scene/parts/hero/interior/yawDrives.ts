import { Matrix4, Path } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { extrudePlan } from '@core/scene/geometry/extrude';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { TURBINE_GEOMETRY } from '../../../../model/layout';
import { degrees, instancedMesh, partMesh } from '../../context';
import type { PartContext } from '../../context';
import { FLOOR_Y, SEGMENTS } from './constants';
import { circlePoints, gearShape, SIDES, turnedUp } from './geometry';

const { radius: DRIVE_RADIUS } = TURBINE_GEOMETRY.yawDrives;
const RING_GEAR = {
  root: 1.62,
  tip: 1.7,
  teeth: 72,
  bore: 1.4,
  top: 103.46,
  boreSegments: 48,
} as const;
const DRIVE_ANGLES_DEG = [50, 65, 115, 130] as const;

export const SECTOR_TOP = 103.56;
export const SECTOR_SPAN_DEG = [40, 140] as const;

const DRIVE_PROFILE: readonly ProfilePoint[] = [
  [FLOOR_Y, 0],
  [FLOOR_Y, 0.19],
  [SECTOR_TOP, 0.19],
  [SECTOR_TOP, 0.27],
  [103.62, 0.27],
  [103.62, 0.2],
  [103.95, 0.2],
  [103.95, 0.23],
  [104.0, 0.23],
  [104.0, 0.17],
  [104.24, 0.17],
  [104.3, 0.12],
  [104.3, 0],
];

export const DRIVE_TOP = 104.3;

export function driveAngles(): number[] {
  return SIDES.flatMap((side) => DRIVE_ANGLES_DEG.map((angle) => side * degrees(angle)));
}

export function drivePosition(angle: number): readonly [x: number, z: number] {
  return [DRIVE_RADIUS * Math.cos(angle), DRIVE_RADIUS * Math.sin(angle)];
}

function ringGear(): BufferGeometry {
  const shape = gearShape(RING_GEAR.root, RING_GEAR.tip, RING_GEAR.teeth);
  shape.holes.push(new Path(circlePoints(RING_GEAR.bore, RING_GEAR.boreSegments)));
  return extrudePlan(shape, FLOOR_Y, RING_GEAR.top);
}

export function buildYawDrives(context: PartContext, parent: Object3D): void {
  parent.add(partMesh(context, ringGear(), 'yawDrives'));
  const angles = driveAngles();
  const drives = instancedMesh(
    context,
    turnedUp(DRIVE_PROFILE, SEGMENTS.drive),
    'yawDrives',
    'castIron',
    angles.length,
  );
  drives.name = 'yawDrives';
  const placement = new Matrix4();
  angles.forEach((angle, index) => {
    const [x, z] = drivePosition(angle);
    drives.setMatrixAt(index, placement.makeTranslation(x, 0, z));
  });
  parent.add(drives);
}

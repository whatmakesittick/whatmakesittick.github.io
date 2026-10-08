import type { BufferGeometry, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { extrudeProfileAlongX, roundedRectShape } from '@core/scene/geometry/extrude';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { partMesh } from '../../context';
import type { PartContext } from '../../context';
import { AXIS_Y, SEGMENTS } from './constants';
import { merge, mirrored, rodAlongX, rodUp, SIDES, span, turned } from './geometry';

const PLANETARY_PROFILE: readonly ProfilePoint[] = [
  [-1.0, 0.56],
  [-1.0, 0.92],
  [-0.92, 1.02],
  [-0.92, 1.3],
  [-0.84, 1.4],
  [-0.72, 1.4],
  [-0.72, 1.32],
  [-0.24, 1.32],
  [-0.24, 1.4],
  [-0.14, 1.4],
  [-0.14, 1.32],
  [0.36, 1.32],
  [0.36, 1.4],
  [0.46, 1.4],
  [0.56, 1.16],
  [0.62, 1.16],
  [0.62, 1.1],
  [0.96, 1.1],
  [0.96, 1.16],
  [1.04, 1.16],
  [1.04, 1.1],
  [1.3, 1.1],
  [1.3, 1.16],
  [1.4, 1.16],
  [1.4, 0.7],
  [1.45, 0.7],
  [1.45, 0],
];

const GUSSETS = { count: 12, x: [-0.72, 0.36], inner: 1.3, outer: 1.37, half: 0.02 } as const;
const HELICAL = { x: [1.4, 2.4], z: 0.95, bottom: -1.15, top: 1.05, corner: 0.22 } as const;
const SPLIT_FLANGE = { x: [1.36, 2.44], y: [-0.03, 0.05], z: 1.02 } as const;
const HELICAL_RIBS = { xs: [1.65, 1.9, 2.15], half: 0.02, y: [-1.0, 0.9], z: [0.93, 1.0] } as const;
const OUTPUT_BOSS: readonly ProfilePoint[] = [
  [2.38, 0],
  [2.38, 0.4],
  [2.47, 0.4],
  [2.47, 0],
];
const LAYSHAFT_COVER: readonly ProfilePoint[] = [
  [2.38, 0],
  [2.38, 0.26],
  [2.44, 0.26],
  [2.44, 0],
];
const LAYSHAFT_Y = 0.62;
const OIL_FILTER = {
  x: 0.95,
  z: 0.5,
  y: [0.9, 1.32],
  radius: 0.14,
  cap: 0.16,
  capTop: 1.37,
} as const;
const TORQUE_ARM = { x: [-0.38, -0.02], y: [-0.86, -0.44], z: [1.1, 1.7] } as const;
const ARM_BUSH = { x: [-0.4, 0], y: -0.65, z: 1.7, radius: 0.21 } as const;

function gussets(): BufferGeometry[] {
  const { count, x, inner, outer, half } = GUSSETS;
  const rib = span(x, [-half, half], [inner, outer]);
  const ribs = Array.from({ length: count }, (_, index) =>
    rib.clone().rotateX(((index + 0.5) / count) * FULL_TURN),
  );
  rib.dispose();
  return ribs;
}

function helicalStage(): BufferGeometry[] {
  const { x, z, bottom, top, corner } = HELICAL;
  const casing = roundedRectShape({ minA: -z, maxA: z, minB: bottom, maxB: top }, corner);
  const ribs = HELICAL_RIBS.xs.flatMap((ribX) =>
    SIDES.map((side) =>
      span(
        [ribX - HELICAL_RIBS.half, ribX + HELICAL_RIBS.half],
        HELICAL_RIBS.y,
        mirrored(HELICAL_RIBS.z, side),
      ),
    ),
  );
  return [
    extrudeProfileAlongX(casing, x[0], x[1]),
    span(SPLIT_FLANGE.x, SPLIT_FLANGE.y, [-SPLIT_FLANGE.z, SPLIT_FLANGE.z]),
    turned(OUTPUT_BOSS, SEGMENTS.medium),
    turned(LAYSHAFT_COVER, SEGMENTS.medium).translate(0, LAYSHAFT_Y, 0),
    ...ribs,
  ];
}

function oilFilter(): BufferGeometry[] {
  const { x, z, y, radius, cap, capTop } = OIL_FILTER;
  return [
    rodUp(y, radius, SEGMENTS.small).translate(x, 0, z),
    rodUp([y[1], capTop], cap, SEGMENTS.small).translate(x, 0, z),
  ];
}

function torqueArms(): BufferGeometry[] {
  return SIDES.flatMap((side) => [
    span(TORQUE_ARM.x, TORQUE_ARM.y, mirrored(TORQUE_ARM.z, side)),
    rodAlongX(ARM_BUSH.x, ARM_BUSH.radius, SEGMENTS.small).translate(
      0,
      ARM_BUSH.y,
      side * ARM_BUSH.z,
    ),
  ]);
}

export const TORQUE_ARM_FOOT_Y = AXIS_Y + TORQUE_ARM.y[0];
export const TORQUE_ARM_X = TORQUE_ARM.x;

export function buildGearbox(context: PartContext, parent: Object3D): void {
  const geometry = merge([
    turned(PLANETARY_PROFILE, SEGMENTS.large),
    ...gussets(),
    ...helicalStage(),
    ...oilFilter(),
    ...torqueArms(),
  ]).translate(0, AXIS_Y, 0);
  parent.add(partMesh(context, geometry, 'gearbox'));
}

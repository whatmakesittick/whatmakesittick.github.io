import type { BufferGeometry, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { partMesh } from '../../context';
import type { PartContext } from '../../context';
import { AXIS_Y, FRAME_TOP_Y, SEGMENTS } from './constants';
import { merge, span, turned } from './geometry';

const SHELL_PROFILE: readonly ProfilePoint[] = [
  [3.4, 0.74],
  [3.4, 0.84],
  [3.5, 0.84],
  [3.5, 0.78],
  [5.3, 0.78],
  [5.3, 0.84],
  [5.4, 0.84],
  [5.4, 0.74],
];

const DRIVE_END_PROFILE: readonly ProfilePoint[] = [
  [3.2, 0],
  [3.2, 0.32],
  [3.27, 0.32],
  [3.27, 0.5],
  [3.4, 0.76],
];

const FAR_END_PROFILE: readonly ProfilePoint[] = [
  [5.4, 0.76],
  [5.5, 0.62],
  [5.5, 0.4],
  [5.6, 0.4],
  [5.6, 0],
];

const FINS = { count: 20, x: [3.56, 5.24], half: 0.0175, radial: [0.76, 0.9] } as const;
const FOOT_BASE = FRAME_TOP_Y - AXIS_Y;
const FEET = {
  xs: [3.7, 5.1],
  saddle: { half: 0.15, top: -0.55, z: 0.72 },
  plate: { half: 0.25, thickness: 0.08, z: 1.05 },
} as const;
const TERMINAL_BOX = {
  x: [4.15, 4.75],
  y: [0.78, 1.18],
  z: 0.35,
  lid: { grow: 0.03, thickness: 0.04 },
} as const;

function fins(): BufferGeometry[] {
  const { count, x, half, radial } = FINS;
  const fin = span(x, [-half, half], radial);
  const all = Array.from({ length: count }, (_, index) =>
    fin.clone().rotateX(((index + 0.5) / count) * FULL_TURN),
  );
  fin.dispose();
  return all;
}

function feet(): BufferGeometry[] {
  const { saddle, plate } = FEET;
  return FEET.xs.flatMap((x) => [
    span([x - saddle.half, x + saddle.half], [FOOT_BASE, saddle.top], [-saddle.z, saddle.z]),
    span(
      [x - plate.half, x + plate.half],
      [FOOT_BASE, FOOT_BASE + plate.thickness],
      [-plate.z, plate.z],
    ),
  ]);
}

function terminalBox(): BufferGeometry[] {
  const { x, y, z, lid } = TERMINAL_BOX;
  return [
    span(x, y, [-z, z]),
    span(
      [x[0] - lid.grow, x[1] + lid.grow],
      [y[1], y[1] + lid.thickness],
      [-z - lid.grow, z + lid.grow],
    ),
  ];
}

export function buildGenerator(context: PartContext, parent: Object3D): void {
  const windings = merge([turned(SHELL_PROFILE, SEGMENTS.large), ...fins()]).translate(
    0,
    AXIS_Y,
    0,
  );
  const shields = merge([
    turned(DRIVE_END_PROFILE, SEGMENTS.large),
    turned(FAR_END_PROFILE, SEGMENTS.large),
  ]).translate(0, AXIS_Y, 0);
  const fittings = merge([...feet(), ...terminalBox()]).translate(0, AXIS_Y, 0);
  parent.add(
    partMesh(context, windings, 'generator'),
    partMesh(context, shields, 'generator', 'steel'),
    partMesh(context, fittings, 'generator', 'castIron'),
  );
}

export const TERMINAL_BOX_TOP = AXIS_Y + TERMINAL_BOX.y[1];

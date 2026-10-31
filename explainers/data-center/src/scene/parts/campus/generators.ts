import { BoxGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { GENSETS } from '../../../model';
import type { Finish } from '../../finishes';
import { boundInstances, instancesOf } from '../context';
import { GENSET_SHAKE_M, GENSET_STACK, PAD_TOP_Y } from './constants';
import { materialOf, partGroup, unitCube } from './kit';
import type { PieceBuilder } from './kit';

type Shape = 'cube' | 'cylinder' | 'louvre';

const LOOKS = {
  shell: ['cube', { color: '#b9b3a0', roughness: 0.62, metalness: 0.12 }],
  frame: ['cube', { color: '#7f7b6e', roughness: 0.55, metalness: 0.2 }],
  door: ['cube', { color: '#aca690', roughness: 0.58, metalness: 0.12 }],
  dark: ['cube', 'steelDark'],
  opening: ['cube', 'fan'],
  louvre: ['louvre', { color: '#56585a', roughness: 0.6, metalness: 0.3 }],
  silencer: ['cylinder', { color: '#3b3a38', roughness: 0.75, metalness: 0.3 }],
  exhaust: ['cylinder', { color: '#8c8e8f', roughness: 0.4, metalness: 0.7 }],
  pad: ['cube', 'concrete'],
} as const satisfies Record<string, readonly [Shape, Finish | MaterialFinish]>;

type Row = readonly [keyof typeof LOOKS, ...number[]];

const QUARTER = FULL_TURN / 4;
const P = 1;
const CYLINDER_SIDES = 16;
const MIRROR_X = [-1, 1];
const ALONG_X = [0, 0, 0, QUARTER] as const;
const FLIP = new Matrix4().makeRotationY(FULL_TURN / 2);
const DOOR_X = [-1.2, 0, 1.2];
const BANDS_X = [-1.15, 0.35, 1.85];
const RIBS_X = [-1.2, -0.2, 0.8, 1.8, 2.8];
const { offsetX: STACK_X, radius: STACK_R, topY: STACK_TOP } = GENSET_STACK;
const STACK_FOOT = 3.2;
const ROOF_Y = 3.68;
const LABEL_UNIT = 2;
const UNIT_PHASE = 2.39996;
const JITTER_RATES = [47, 61, 53];
const JITTER_LIFT = 0.5;

const ROWS: readonly Row[] = [
  ['shell', 0, 1.78, 0, 6.8, 2.36, 2.16],
  ['shell', -2.45, 3.03, 0, 1.8, 0.14, 2.0],
  ...MIRROR_X.map((x): Row => ['frame', x * 3.43, 1.72, 1.1, 0.14, 2.24, 0.14, P]),
  ['frame', 0, 0.51, 1.12, 7.0, 0.18, 0.1, P],
  ['frame', 3.45, 0.51, 0, 0.1, 0.18, 2.14, P],
  ['frame', 0, 2.92, 1.12, 7.0, 0.16, 0.1, P],
  ['frame', 3.45, 2.92, 0, 0.1, 0.16, 2.14, P],
  ...MIRROR_X.map((x): Row => ['frame', x * 1.84, 1.78, 1.095, 0.06, 2.36, 0.03, P]),
  ...RIBS_X.map((x): Row => ['frame', x, 2.975, 0, 0.06, 0.03, 2.14]),
  ...DOOR_X.map((x): Row => ['door', x, 1.725, 1.09, 0.95, 1.95, 0.02, P]),
  ...DOOR_X.map((x): Row => ['dark', x + 0.36, 1.55, 1.12, 0.04, 0.26, 0.04, P]),
  ['dark', 0, 0.21, 0, 6.9, 0.42, 2.26],
  ['dark', -2.6, 0.24, 1.15, 0.45, 0.26, 0.1],
  ...[-0.7, 1.4].map((x): Row => ['dark', x, 3.04, 0, 0.12, 0.16, 0.5]),
  ['dark', STACK_X, 3.08, 0, 0.26, 0.24, 0.26],
  ...MIRROR_X.map((x): Row => ['opening', x * 2.625, 1.725, 1.09, 1.25, 1.75, 0.02, P]),
  ['opening', 3.41, 1.725, 0, 0.02, 1.75, 1.9, P],
  ['opening', -2.45, 3.11, 0, 1.7, 0.02, 1.9],
  ...MIRROR_X.map((x): Row => ['louvre', x * 2.625, 1.725, 1.08, 1.25, 1.75, 1, P]),
  ['louvre', 3.4, 1.725, 0, 1.9, 1.75, 1, P, 0, QUARTER],
  ['louvre', -2.45, 3.1, 0, 1.7, 1.9, 1, 0, -QUARTER],
  ['silencer', 0.35, 3.38, 0, 0.3, 3.1, 0.3, ...ALONG_X],
  ...BANDS_X.map((x): Row => ['silencer', x, 3.38, 0, 0.33, 0.06, 0.33, ...ALONG_X]),
  ['exhaust', -0.9, 3.17, 0, 0.13, 0.42, 0.13],
  ['exhaust', (1.9 + STACK_X) / 2, 3.38, 0, 0.13, STACK_X - 1.9, 0.13, ...ALONG_X],
  ['exhaust', STACK_X, (STACK_FOOT + STACK_TOP) / 2, 0, STACK_R, STACK_TOP - STACK_FOOT, STACK_R],
  ['exhaust', STACK_X, STACK_TOP - 0.03, 0, 0.19, 0.06, 0.19],
  ['exhaust', 3.525, 1.5, 0.85, 0.025, 2.4, 0.025],
  ['pad', 0, PAD_TOP_Y - 0.1, 0, 7.6, 0.2, 2.9],
];

function rowMatrices(row: Row): Matrix4[] {
  const [, x, y, z, w, h, d, paired = 0, pitch = 0, yaw = 0, roll = 0] = row;
  const turn = new Quaternion().setFromEuler(new Euler(pitch, yaw, roll));
  const matrix = new Matrix4().compose(new Vector3(x, y, z), turn, new Vector3(w, h, d));
  return paired ? [matrix, FLIP.clone().multiply(matrix)] : [matrix];
}

const LOUVRE = { slats: 9, tilt: 0.6, depth: 0.05, border: 0.05, slat: 0.09, blade: 0.012 };

function louvreGeometry(): BufferGeometry {
  const { slats, tilt, depth, border, slat, blade } = LOUVRE;
  const inner = 1 - 2 * border;
  const edge = 0.5 - border / 2;
  const piece = (w: number, h: number, d: number, x: number, y: number, pitch = 0) =>
    new BoxGeometry(w, h, d).rotateX(pitch).translate(x, y, depth / 2);
  return mergeGeometries([
    ...[-edge, edge].map((at) => piece(1, border, depth, 0, at)),
    ...[-edge, edge].map((at) => piece(border, inner, depth, at, 0)),
    ...Array.from({ length: slats }, (_, index) =>
      piece(inner, slat, blade, 0, ((index + 0.5) / slats - 0.5) * inner, -tilt),
    ),
  ]);
}

export const buildGenerators: PieceBuilder = (context, root) => {
  const [labelX, , labelZ] = GENSETS[LABEL_UNIT].base;
  const group = partGroup(context, 'generators', root, [labelX, ROOF_Y, labelZ]);
  const cylinder = new CylinderGeometry(1, 1, 1, CYLINDER_SIDES);
  const shapes = { cube: unitCube(context), cylinder, louvre: louvreGeometry() };
  const units = GENSETS.map(({ base: [x, , z] }) => new Matrix4().makeTranslation(x, 0, z));
  const meshes = Object.entries(LOOKS).flatMap(([part, [shape, finish]]) => {
    const local = ROWS.filter((row) => row[0] === part).flatMap(rowMatrices);
    const rest = units.flatMap((unit) => local.map((matrix) => unit.clone().multiply(matrix)));
    const material = materialOf(context, 'generators', finish);
    const mesh = instancesOf(context, shapes[shape], material, rest);
    group.add(mesh);
    return part === 'pad' ? [] : [{ mesh, rest, perUnit: local.length }];
  });
  const offsets = units.map(() => new Vector3());
  const moved = new Matrix4();
  let resting = true;
  return {
    animate({ outage }) {
      if (outage.gensets === 0 && resting) return false;
      resting = outage.gensets === 0;
      const amplitude = GENSET_SHAKE_M * outage.gensets;
      offsets.forEach((offset, unit) => {
        const wave = (axis: number) =>
          Math.sin(outage.elapsed * JITTER_RATES[axis] + unit * UNIT_PHASE * (axis + 1));
        offset.set(wave(0), wave(1) * JITTER_LIFT, wave(2)).multiplyScalar(amplitude);
      });
      meshes.forEach(({ mesh, rest, perUnit }) => {
        rest.forEach((matrix, index) => {
          const offset = offsets[Math.floor(index / perUnit)];
          const shifted = moved.makeTranslation(offset).multiply(matrix);
          mesh.setMatrixAt(index, resting ? matrix : shifted);
        });
        boundInstances(mesh);
      });
      return true;
    },
  };
};

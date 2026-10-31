import { Color } from 'three';
import type { Material, Object3D } from 'three';
import { lerp } from '@core/math';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import { BATTERIES, SWITCHGEAR, UPS, boxSpan, spanning } from '../../../model';
import type { BoxSpec } from '../../../model';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { boxMatrix, instancesOf, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { materialOf, unitCube } from './kit';

type Feature = readonly [string, number, number, number, number, number, number, number?];

interface LineUpKind {
  readonly part: 'switchgear' | 'ups' | 'batteries';
  readonly block: BoxSpec;
  readonly rows: readonly number[];
  readonly cabinets: number;
  readonly features: readonly Feature[];
}

const [SINGLE, BOTH, ALTERNATE] = [0, 1, 2] as const;
export const SIDES = [-1, 1] as const;
const LINE_UP_ROWS = [-2.4, 0, 2.4];
const SHELVES = [0.1, 0.6, 1.1, 1.6];
const SLOTS = [-0.25, 0.25];
const GLOW_REST = 0.08;
const GLOW: MaterialFinish = { color: '#3a2c1c', emissive: '#000', emissiveIntensity: 1.6 };
const SCREEN: MaterialFinish = { color: '#0d1216', emissive: '#86d6ee', emissiveIntensity: 0.9 };

const LOOKS: Readonly<Record<string, MaterialFinish>> = {
  ...FINISHES,
  gearBody: { color: '#9aa0a6', roughness: 0.6, metalness: 0.15 },
  gearDoor: { color: '#b4b9be', roughness: 0.5, metalness: 0.15 },
  upsBody: { color: '#2c3035', roughness: 0.6, metalness: 0.2 },
  upsDoor: { color: '#3b4046', roughness: 0.5, metalness: 0.2 },
  screen: SCREEN,
};

export function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

export const LINE_UPS: readonly LineUpKind[] = [
  {
    part: 'switchgear',
    block: SWITCHGEAR,
    rows: LINE_UP_ROWS,
    cabinets: 7,
    features: [
      ['gearBody', 0, 0.98, 0.1, 2.2, 0, 1.12],
      ['steelDark', 0, 1, 0, 0.1, 0, 1.06],
      ['gearDoor', 0, 0.96, 2.2, 2.22, 0, 1.08],
      ['steelDark', 0, 0.6, 2.2, 2.26, 0, 0.5],
      ['gearDoor', 0, 0.92, 1.56, 2.12, 0.57, 0.02, BOTH],
      ['gearDoor', 0, 0.92, 0.16, 1.5, 0.57, 0.02, BOTH],
      ['steelDark', 0.37, 0.035, 0.75, 1.05, 0.59, 0.06, BOTH],
      ['steelDark', 0.37, 0.035, 1.72, 1.86, 0.59, 0.06, BOTH],
      ['steelDark', 0, 0.62, 0.24, 0.4, 0.58, 0.04, BOTH],
      ['steelDark', -0.1, 0.34, 1.0, 1.24, 0.58, 0.04, BOTH],
      ['screen', -0.22, 0.2, 1.84, 1.98, 0.58, 0.04, BOTH],
      ...[0.02, 0.1, 0.18].map((x): Feature => [
        'statusLight',
        x,
        0.04,
        1.9,
        1.94,
        0.58,
        0.04,
        BOTH,
      ]),
    ],
  },
  {
    part: 'ups',
    block: UPS,
    rows: LINE_UP_ROWS,
    cabinets: 9,
    features: [
      ['upsBody', 0, 0.76, 0.1, 2.2, 0, 1.12],
      ['fan', 0, 0.78, 0, 0.1, 0, 1.06],
      ['upsDoor', 0, 0.74, 2.2, 2.22, 0, 1.08],
      ...SIDES.map((x): Feature => ['fan', x * 0.17, 0.28, 2.2, 2.24, 0, 0.28]),
      ['upsDoor', 0, 0.72, 0.14, 2.1, 0.57, 0.02, BOTH],
      ['fan', 0, 0.58, 1.72, 2.0, 0.58, 0.04, BOTH],
      ['fan', 0, 0.58, 0.24, 0.62, 0.58, 0.04, BOTH],
      ['fan', 0.3, 0.03, 0.95, 1.25, 0.59, 0.06, BOTH],
      ['screen', -0.08, 0.24, 1.3, 1.46, 0.58, 0.04, ALTERNATE],
      ['statusLight', 0.16, 0.12, 1.37, 1.4, 0.58, 0.04, BOTH],
    ],
  },
  {
    part: 'batteries',
    block: BATTERIES,
    rows: [-3.6, -1.2, 1.2, 3.6],
    cabinets: 7,
    features: [
      ...SIDES.map((x): Feature => ['steel', x * 0.475, 0.05, 0, 2.17, 0.375, 0.05, BOTH]),
      ['steel', 0, 1, 2.06, 2.17, 0.375, 0.05, BOTH],
      ['steel', 0, 1, 2.17, 2.2, 0, 0.8],
      ...SHELVES.map((y): Feature => ['steel', 0, 1, y - 0.025, y, 0, 0.8]),
      ['strip', 0, 1, 2.09, 2.14, 0.41, 0.02],
      ...SHELVES.flatMap((y) =>
        SLOTS.flatMap((x): Feature[] => [
          ['battery', x, 0.42, y, y + 0.4, 0, 0.6],
          ['cabinet', x, 0.24, y + 0.22, y + 0.32, 0.31, 0.02],
          ['statusLight', x + 0.16, 0.03, y + 0.29, y + 0.32, 0.31, 0.02],
        ]),
      ),
    ],
  },
];

export function lineUp(context: PartContext, kind: LineUpKind, into: Object3D, glow: Material) {
  const { block, rows, cabinets, features } = kind;
  const specs = new Map<string, BoxSpec[]>();
  const [x0, x1] = boxSpan(block).x;
  rows.forEach((row) =>
    Array.from({ length: cabinets }, (_, cabinet) =>
      features.forEach(([look, x, w, y0, y1, z, d, mode = SINGLE]) => {
        if (mode === ALTERNATE && cabinet % 2 === 1) return;
        const centre = x0 + ((cabinet + 0.5) * (x1 - x0)) / cabinets + x;
        const boxes = (mode === SINGLE ? [1] : SIDES).map((side) =>
          spanning(around(centre, w), [y0, y1], around(block.base[2] + row + side * z, d)),
        );
        specs.set(look, [...(specs.get(look) ?? []), ...boxes]);
      }),
    ),
  );
  specs.forEach((list, look) => {
    const material = look === 'strip' ? glow : materialOf(context, kind.part, LOOKS[look]);
    const matrices = list.map((spec) => boxMatrix(spec));
    into.add(instancesOf(context, unitCube(context), material, matrices));
  });
}

export function batteryGlow(context: PartContext): [Material, (share: number) => void] {
  const glow = registeredMaterial(context, 'batteries', createMaterial(GLOW));
  const lit = new Color(THEME.current);
  const show = (share: number) => glow.emissive.copy(lit).multiplyScalar(lerp(GLOW_REST, 1, share));
  show(0);
  return [glow, show];
}

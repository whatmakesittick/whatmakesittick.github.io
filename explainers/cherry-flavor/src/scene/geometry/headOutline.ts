import type { Vector2 } from 'three';
import { DETAIL } from '../constants';
import { joinLoop, smoothChain, straight } from './outline';
import type { Edge, Flat } from './outline';

const JOINTS = {
  neckFront: [4.6, -11],
  lowerLip: [9.55, -2.1],
  upperLip: [9.65, -0.95],
  nostrilBack: [9.6, 0.6],
  nostrilFront: [10.45, 0.72],
  neckBack: [-4.4, -11],
  throatBack: [-0.15, -11],
  throatFront: [1.15, -11],
} as const satisfies Record<string, Flat>;

const FRONT: readonly Flat[] = [
  JOINTS.neckFront,
  [4.9, -8.6],
  [6.1, -7.1],
  [8.2, -6.4],
  [9.4, -5.5],
  [9.65, -4.4],
  [9.25, -3.5],
  [9.75, -2.75],
  JOINTS.lowerLip,
];

const UPPER_LIP: readonly Flat[] = [
  JOINTS.upperLip,
  [9.95, -0.35],
  [9.6, 0.25],
  JOINTS.nostrilBack,
];

const CROWN: readonly Flat[] = [
  JOINTS.nostrilFront,
  [11.05, 1.25],
  [10.95, 2.05],
  [10.2, 3.6],
  [9.55, 4.75],
  [9.8, 5.7],
  [9.6, 7.4],
  [8.3, 9.8],
  [5.8, 11.4],
  [2, 12],
  [-2.5, 11.6],
  [-6.6, 9.6],
  [-9, 6],
  [-9.6, 2],
  [-8.8, -1.8],
  [-6.8, -4.2],
  [-5, -6],
  [-4.5, -8.5],
  JOINTS.neckBack,
];

const AIRWAY_WALL: readonly Flat[] = [
  JOINTS.throatBack,
  [-0.1, -9],
  [-0.3, -6.5],
  [-0.4, -3.5],
  [-0.25, -0.8],
  [-0.05, 1.8],
  [0.35, 3.6],
  [1.2, 4.45],
  [2.3, 4.95],
  [3.4, 5.12],
  [6, 5.12],
  [7.3, 4.95],
  [8.35, 4.2],
  [9.2, 2.85],
  [9.95, 1.55],
  [10.25, 1.05],
  JOINTS.nostrilFront,
];

const PALATE_EDGE: readonly Flat[] = [
  JOINTS.nostrilBack,
  [9.3, 0.88],
  [8.4, 0.62],
  [6, 0.5],
  [3.6, 0.5],
  [2.6, 0.35],
  [2.05, -0.3],
  [1.75, -0.95],
  [1.95, -1.2],
  [2.6, -0.8],
  [3.5, -0.25],
  [5, -0.05],
  [7, -0.08],
  [8.1, -0.25],
  [8.7, -0.55],
  [9.1, -0.85],
  JOINTS.upperLip,
];

const JAW_EDGE: readonly Flat[] = [
  JOINTS.lowerLip,
  [9.05, -2.15],
  [8.6, -2.5],
  [7.6, -2.95],
  [5.5, -3.35],
  [3.2, -3.65],
  [2, -3.95],
  [1.3, -4.4],
  [1.15, -6],
  [1.1, -8.5],
  JOINTS.throatFront,
];

const STEP = DETAIL.outlineStep;

function chain(points: readonly Flat[]): Vector2[] {
  return smoothChain(points, STEP);
}

export interface Piece {
  readonly points: Vector2[];
  readonly outer: boolean[];
}

const outer = (points: Vector2[]): Edge => ({ points, outer: true });
const inner = (points: Vector2[]): Edge => ({ points, outer: false });

export function headPieces(): Piece[] {
  const skull = joinLoop([
    outer(chain(CROWN)),
    outer(straight(JOINTS.neckBack, JOINTS.throatBack, STEP)),
    inner(chain(AIRWAY_WALL)),
  ]);
  const palate = joinLoop([outer(chain(UPPER_LIP)), inner(chain(PALATE_EDGE))]);
  const jaw = joinLoop([
    outer(chain(FRONT)),
    inner(chain(JAW_EDGE)),
    outer(straight(JOINTS.throatFront, JOINTS.neckFront, STEP)),
  ]);
  return [skull, palate, jaw];
}

export function silhouette(): Vector2[] {
  return joinLoop([
    outer(chain(FRONT)),
    outer(straight(JOINTS.lowerLip, JOINTS.upperLip, STEP)),
    outer(chain(UPPER_LIP)),
    outer(straight(JOINTS.nostrilBack, JOINTS.nostrilFront, STEP)),
    outer(chain(CROWN)),
    outer(straight(JOINTS.neckBack, JOINTS.neckFront, STEP)),
  ]).points;
}

export const CAVITY_BACK: readonly Flat[] = [
  [9.5, -2.2],
  [8.4, -3.1],
  [5.5, -3.7],
  [2.3, -4.3],
  [1.6, -6],
  [1.5, -11],
  [-0.5, -11],
  [-0.7, -4],
  [-0.5, -0.8],
  [-0.3, 1.9],
  [0.1, 3.8],
  [1.1, 4.7],
  [2.2, 5.25],
  [3.4, 5.4],
  [7.3, 5.25],
  [8.6, 4.4],
  [9.5, 2.9],
  [10.2, 1.5],
  [10.35, 0.8],
  [9.4, 0.5],
  [9.5, -0.9],
];

import type { PlanPoint } from '@core/scene/geometry/extrude';
import { BED } from '../constants';
import { TRACK_TONES } from '../finishes';
import type { ProfilePoint } from '../geometry/strip';
import { MAST } from './constants';

const { ballast, rail } = TRACK_TONES;
const TOP = BED.ballastTop;

export const BALLAST_HALF_PROFILE: readonly ProfilePoint[] = [
  { z: 0, y: TOP, tone: ballast.crib },
  { z: 0.48, y: TOP, tone: ballast.crib },
  { z: 0.76, y: TOP, tone: ballast.rust },
  { z: 1.08, y: TOP, tone: ballast.bed },
  { z: 1.7, y: TOP, tone: ballast.shoulder },
  { z: 1.83, y: TOP * 0.97, tone: ballast.shoulder },
  { z: 1.95, y: TOP * 0.82, tone: ballast.slope },
  { z: 2.36, y: TOP * 0.18, tone: ballast.slope },
  { z: 2.5, y: 0, tone: ballast.toe },
];

export const RAIL_HALF_PROFILE: readonly ProfilePoint[] = [
  { z: 0, y: 0.176, tone: rail.crown },
  { z: 0.016, y: 0.1755, tone: rail.crown },
  { z: 0.028, y: 0.173, tone: rail.corner },
  { z: 0.0355, y: 0.166, tone: rail.head },
  { z: 0.0365, y: 0.15, tone: rail.head },
  { z: 0.035, y: 0.138, tone: rail.web },
  { z: 0.018, y: 0.133, tone: rail.web },
  { z: 0.009, y: 0.122, tone: rail.web },
  { z: 0.008, y: 0.06, tone: rail.web },
  { z: 0.013, y: 0.042, tone: rail.web },
  { z: 0.04, y: 0.026, tone: rail.web },
  { z: 0.075, y: 0.012, tone: rail.web },
  { z: 0.075, y: 0, tone: rail.web },
];

export function mastPlan(): PlanPoint[] {
  const half = MAST.section / 2;
  const inner = half - MAST.flangeThickness;
  const web = MAST.webThickness / 2;
  const corners: readonly (readonly [number, number])[] = [
    [-half, -half],
    [half, -half],
    [half, -inner],
    [web, -inner],
    [web, inner],
    [half, inner],
    [half, half],
    [-half, half],
    [-half, inner],
    [-web, inner],
    [-web, -inner],
    [-half, -inner],
  ];
  return corners.map(([x, z]) => ({ x, z: z + MAST.z }));
}

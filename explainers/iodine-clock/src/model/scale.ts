import type { ElementId, Molarities, SpeciesCounts } from '../ids';
import { I2_FINAL_M } from './kinetics';
import { BISULFITE_START_M, IODATE_RANGE_MM, toMolar } from './recipe';

export const DRAW_RADIUS_A: Readonly<Record<ElementId, number>> = {
  I: 0.9,
  S: 0.7,
  O: 0.55,
  H: 0.3,
};

export const BOND_RADIUS_A = 0.15;

export const BOND_LENGTH_A = {
  iodineOxygen: 1.8,
  sulfateSulfurOxygen: 1.5,
  bisulfiteSulfurOxygen: 1.53,
  oxygenHydrogen: 0.97,
  iodine: 2.67,
  triiodide: 2.9,
  chain: 3.1,
} as const;

export const BOND_ANGLE_DEG = {
  iodatePyramid: 100,
  tetrahedron: 109.5,
} as const;

export const HELIX_GEOMETRY = {
  turns: 5,
  pitchA: 8,
  outerRadiusA: 6.5,
  channelRadiusA: 2.5,
  ringsPerTurn: 6,
  maxChainAtoms: 12,
  leftHanded: true,
} as const;

export const HELIX_RINGS = HELIX_GEOMETRY.turns * HELIX_GEOMETRY.ringsPerTurn;
export const HELIX_HEIGHT_A = HELIX_GEOMETRY.turns * HELIX_GEOMETRY.pitchA;

export const WATER_POINTS = 600;
export const DRAWN_PER_MOLAR = 720;

export function drawnCount(molar: number): number {
  return Math.round(Math.max(0, molar) * DRAWN_PER_MOLAR);
}

export function drawnCounts(reading: Readonly<Molarities>, out: SpeciesCounts): SpeciesCounts {
  out.iodate = drawnCount(reading.iodateM);
  out.bisulfite = drawnCount(reading.bisulfiteM);
  out.sulfate = drawnCount(reading.sulfateM);
  out.iodide = drawnCount(reading.iodideM);
  out.hydrogenIon = drawnCount(reading.acidM);
  out.iodine = drawnCount(reading.iodineM);
  return out;
}

const IODIDE_PEAK_M = BISULFITE_START_M / 3;

export const MAX_DRAWN_COUNTS: Readonly<SpeciesCounts> = {
  iodate: drawnCount(toMolar(IODATE_RANGE_MM.max)),
  bisulfite: drawnCount(BISULFITE_START_M),
  sulfate: drawnCount(BISULFITE_START_M),
  iodide: drawnCount(IODIDE_PEAK_M),
  hydrogenIon: drawnCount(BISULFITE_START_M),
  iodine: drawnCount(I2_FINAL_M),
};

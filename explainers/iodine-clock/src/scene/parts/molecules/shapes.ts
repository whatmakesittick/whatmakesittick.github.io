import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { ElementId, SpeciesId } from '../../../ids';
import { BOND_ANGLE_DEG, BOND_LENGTH_A } from '../../../model';
import { SHAPE_ANGLES } from '../../constants';

export interface AtomSpec {
  readonly element: ElementId;
  readonly at: Vector3;
}

export interface MoleculeShape {
  readonly atoms: readonly AtomSpec[];
  readonly bonds: readonly (readonly [number, number])[];
}

const THIRD_TURN = (Math.PI * 2) / 3;
const HALF = 0.5;
const PYRAMID_LEGS = 3;

export function pyramidPolar(bondAngleDeg: number): number {
  const cosine = Math.cos(toRadians(bondAngleDeg));
  return Math.acos(Math.sqrt((HALF + cosine) / (1 + HALF)));
}

export function legDirection(polar: number, azimuth: number): Vector3 {
  return new Vector3(
    Math.sin(polar) * Math.cos(azimuth),
    -Math.cos(polar),
    Math.sin(polar) * Math.sin(azimuth),
  );
}

export function legAzimuth(leg: number): number {
  return SHAPE_ANGLES.firstLeg + leg * THIRD_TURN;
}

export const IODATE_POLAR = pyramidPolar(BOND_ANGLE_DEG.iodatePyramid);
export const SULFITE_POLAR = pyramidPolar(SHAPE_ANGLES.sulfitePyramidDeg);
export const TETRA_POLAR = pyramidPolar(BOND_ANGLE_DEG.tetrahedron);

function legs(centre: ElementId, length: number, polar: number): AtomSpec[] {
  return [
    { element: centre, at: new Vector3() },
    ...Array.from({ length: PYRAMID_LEGS }, (_, leg) => ({
      element: 'O' as const,
      at: legDirection(polar, legAzimuth(leg)).multiplyScalar(length),
    })),
  ];
}

const LEG_BONDS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
];

export function hydroxylHydrogen(oxygen: Vector3): Vector3 {
  const out = oxygen.clone().normalize();
  const down = new Vector3(0, -1, 0).addScaledVector(out, out.y).normalize();
  const angle = toRadians(SHAPE_ANGLES.hydroxylDeg);
  const direction = out.multiplyScalar(-Math.cos(angle)).addScaledVector(down, Math.sin(angle));
  return oxygen.clone().addScaledVector(direction, BOND_LENGTH_A.oxygenHydrogen);
}

function bisulfite(): MoleculeShape {
  const atoms = legs('S', BOND_LENGTH_A.bisulfiteSulfurOxygen, SULFITE_POLAR);
  return {
    atoms: [...atoms, { element: 'H', at: hydroxylHydrogen(atoms[1].at) }],
    bonds: [...LEG_BONDS, [1, 4]],
  };
}

function sulfate(): MoleculeShape {
  const length = BOND_LENGTH_A.sulfateSulfurOxygen;
  return {
    atoms: [...legs('S', length, TETRA_POLAR), { element: 'O', at: new Vector3(0, length, 0) }],
    bonds: [...LEG_BONDS, [0, 4]],
  };
}

function line(count: number, spacing: number): MoleculeShape {
  const offset = ((count - 1) * spacing) / 2;
  return {
    atoms: Array.from({ length: count }, (_, index) => ({
      element: 'I' as const,
      at: new Vector3(index * spacing - offset, 0, 0),
    })),
    bonds: Array.from({ length: count - 1 }, (_, index) => [index, index + 1] as const),
  };
}

export const SHAPES = {
  iodate: { atoms: legs('I', BOND_LENGTH_A.iodineOxygen, IODATE_POLAR), bonds: LEG_BONDS },
  bisulfite: bisulfite(),
  sulfate: sulfate(),
  iodide: { atoms: [{ element: 'I', at: new Vector3() }], bonds: [] },
  hydrogenIon: { atoms: [{ element: 'H', at: new Vector3() }], bonds: [] },
  iodine: line(2, BOND_LENGTH_A.iodine),
  triiodide: line(3, BOND_LENGTH_A.triiodide),
} as const satisfies Record<SpeciesId | 'triiodide', MoleculeShape>;

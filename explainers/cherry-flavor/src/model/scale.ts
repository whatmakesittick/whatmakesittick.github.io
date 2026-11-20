import { clamp } from '@core/math';
import { ODORANT_IDS } from '../ids';
import type { ElementId, OdorantLevels, ScaleId } from '../ids';

export const HEAD_UNIT = 'cm';
export const TONGUE_UNIT = 'mm';
export const MOLECULE_UNIT = 'Å';

export const SCALE_UNIT: Readonly<Record<ScaleId, string>> = {
  head: HEAD_UNIT,
  tongue: TONGUE_UNIT,
  molecules: MOLECULE_UNIT,
};

export const ATOM_DRAW_RADIUS: Readonly<Record<ElementId, number>> = {
  C: 0.7,
  O: 0.66,
  H: 0.35,
};

export const BOND_RADIUS = 0.15;

export const COPIES_PER_SHARE = 13;
export const MAX_COPIES = 10;

export function copiesFor(level: number): number {
  return clamp(Math.round(level * COPIES_PER_SHARE), 0, MAX_COPIES);
}

export function copiesOf(profile: Readonly<OdorantLevels>, out: OdorantLevels): OdorantLevels {
  ODORANT_IDS.forEach((id) => {
    out[id] = copiesFor(profile[id]);
  });
  return out;
}

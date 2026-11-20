import { ODORANT_IDS } from '../ids';
import type { OdorantId } from '../ids';
import { RECEPTOR_GRID } from './layout';

export const RECEPTOR_TYPES = RECEPTOR_GRID.columns * RECEPTOR_GRID.rows;

export const REAL_RECEPTOR_TYPES = 400;

export const RECEPTOR_CODES: Readonly<Record<OdorantId, readonly number[]>> = {
  benzaldehyde: [3, 11, 18, 26],
  hexenal: [3, 7, 22, 30, 35],
  linalool: [1, 14, 18, 29],
  eugenol: [9, 11, 24, 37],
  ionone: [5, 14, 27, 33, 38],
};

export const RECEPTOR_ODORANTS: readonly (readonly OdorantId[])[] = Array.from(
  { length: RECEPTOR_TYPES },
  (_, index) => ODORANT_IDS.filter((id) => RECEPTOR_CODES[id].includes(index)),
);

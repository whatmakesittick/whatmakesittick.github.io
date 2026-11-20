import { describe, expect, it } from 'vitest';
import { ODORANT_IDS } from '../ids';
import { RECEPTOR_GRID } from './layout';
import {
  REAL_RECEPTOR_TYPES,
  RECEPTOR_CODES,
  RECEPTOR_ODORANTS,
  RECEPTOR_TYPES,
} from './receptorCodes';

describe('receptor codes', () => {
  it('draws forty types on the eight by five grid for about four hundred real ones', () => {
    expect(RECEPTOR_TYPES).toBe(40);
    expect(RECEPTOR_GRID.columns * RECEPTOR_GRID.rows).toBe(RECEPTOR_TYPES);
    expect(REAL_RECEPTOR_TYPES).toBe(400);
  });

  it('codes every odorant with four or five distinct cells on the grid', () => {
    ODORANT_IDS.forEach((id) => {
      const code = RECEPTOR_CODES[id];
      expect(code.length).toBeGreaterThanOrEqual(4);
      expect(code.length).toBeLessThanOrEqual(5);
      expect(new Set(code).size).toBe(code.length);
      code.forEach((index) => {
        expect(Number.isInteger(index)).toBe(true);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(RECEPTOR_TYPES);
      });
    });
  });

  it('shares exactly cells 3, 11, 14 and 18 between two odorants', () => {
    const shared = RECEPTOR_ODORANTS.flatMap((odorants, index) =>
      odorants.length > 1 ? [index] : [],
    );
    expect(shared).toEqual([3, 11, 14, 18]);
    expect(RECEPTOR_ODORANTS[3]).toEqual(['benzaldehyde', 'hexenal']);
    expect(RECEPTOR_ODORANTS[14]).toEqual(['linalool', 'ionone']);
  });

  it('gives every odorant a different pattern', () => {
    const patterns = ODORANT_IDS.map((id) => RECEPTOR_CODES[id].join(','));
    expect(new Set(patterns).size).toBe(ODORANT_IDS.length);
  });
});

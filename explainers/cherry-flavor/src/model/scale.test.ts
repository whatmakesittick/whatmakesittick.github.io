import { describe, expect, it } from 'vitest';
import { ODORANT_IDS } from '../ids';
import type { OdorantLevels } from '../ids';
import {
  ATOM_DRAW_RADIUS,
  BOND_RADIUS,
  COPIES_PER_SHARE,
  MAX_COPIES,
  SCALE_UNIT,
  copiesFor,
  copiesOf,
} from './scale';

const FRUIT_DROPS: OdorantLevels = {
  benzaldehyde: 6,
  hexenal: 3,
  linalool: 2,
  eugenol: 1,
  ionone: 1,
};

function empty(): OdorantLevels {
  return { benzaldehyde: 0, hexenal: 0, linalool: 0, eugenol: 0, ionone: 0 };
}

describe('scale', () => {
  it('draws the head in centimetres, the tongue in millimetres and molecules in ångström', () => {
    expect(SCALE_UNIT).toEqual({ head: 'cm', tongue: 'mm', molecules: 'Å' });
  });

  it('draws oxygen a little smaller than carbon and hydrogen smallest, bonds thinner still', () => {
    expect(ATOM_DRAW_RADIUS.O).toBeLessThan(ATOM_DRAW_RADIUS.C);
    expect(ATOM_DRAW_RADIUS.H).toBeLessThan(ATOM_DRAW_RADIUS.O);
    expect(BOND_RADIUS).toBeLessThan(ATOM_DRAW_RADIUS.H);
  });

  it('draws the cherry profile as the fruit recipe drops', () => {
    const profile = empty();
    ODORANT_IDS.forEach((id) => (profile[id] = FRUIT_DROPS[id] / COPIES_PER_SHARE));
    expect(copiesOf(profile, empty())).toEqual(FRUIT_DROPS);
  });

  it('never draws fewer than none or more than the cap', () => {
    expect(copiesFor(-1)).toBe(0);
    expect(copiesFor(0)).toBe(0);
    expect(copiesFor(1)).toBe(MAX_COPIES);
    expect(copiesFor(10 / COPIES_PER_SHARE)).toBe(MAX_COPIES);
  });
});

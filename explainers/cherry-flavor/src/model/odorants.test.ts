import { describe, expect, it } from 'vitest';
import { copiesOf } from './scale';
import {
  CLEAR_DROPS,
  DESK_START,
  FOOD_PROFILES,
  FRUIT_DROPS,
  SWEETS_DROPS,
  cherryMatch,
  closestSmell,
  emptyLevels,
  profileOf,
  recipeOf,
} from './odorants';

describe('odorant profiles', () => {
  it('puts benzaldehyde first in the cherry mix', () => {
    expect(FOOD_PROFILES.cherry.benzaldehyde).toBeCloseTo(0.46, 2);
    expect(FOOD_PROFILES.marzipan).toMatchObject({ benzaldehyde: 1, hexenal: 0 });
  });

  it('draws the same molecules as the fruit recipe drops', () => {
    expect(copiesOf(FOOD_PROFILES.cherry, emptyLevels())).toEqual(FRUIT_DROPS);
    expect(copiesOf(profileOf('desk', SWEETS_DROPS), emptyLevels())).toEqual(SWEETS_DROPS);
  });

  it('names the closest smell on the desk', () => {
    expect(closestSmell(CLEAR_DROPS)).toBe('empty');
    expect(closestSmell(FRUIT_DROPS)).toBe('cherry');
    expect(closestSmell(SWEETS_DROPS)).toBe('sweets');
    expect(closestSmell(DESK_START)).toBe('marzipan');
    expect(closestSmell({ ...CLEAR_DROPS, ionone: 5, linalool: 5 })).toBe('new');
  });

  it('scores the match with the fruit', () => {
    expect(cherryMatch(FRUIT_DROPS)).toBeCloseTo(1, 6);
    expect(cherryMatch(DESK_START)).toBeCloseTo(0.84, 2);
    expect(cherryMatch(CLEAR_DROPS)).toBe(0);
  });

  it('finds the recipe that matches the drops', () => {
    expect(recipeOf({ ...FRUIT_DROPS })).toBe('fruit');
    expect(recipeOf(DESK_START)).toBeNull();
  });
});

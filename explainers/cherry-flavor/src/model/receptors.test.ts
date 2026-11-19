import { describe, expect, it } from 'vitest';
import { emptyLevels } from './odorants';
import { RECEPTOR_CODES, RECEPTOR_TYPES } from './receptorCodes';
import { firingCount, receptorActivation } from './receptors';

describe('receptor activation', () => {
  it('stays quiet with no aroma', () => {
    const activation = receptorActivation(emptyLevels(), 'mix');
    expect(activation).toHaveLength(RECEPTOR_TYPES);
    expect(firingCount(activation)).toBe(0);
  });

  it('fires exactly the coded cells for one bottle', () => {
    const activation = receptorActivation(emptyLevels(), 'hexenal');
    expect(firingCount(activation)).toBe(RECEPTOR_CODES.hexenal.length);
    RECEPTOR_CODES.hexenal.forEach((index) => expect(activation[index]).toBe(1));
  });
});

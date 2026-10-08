import { describe, expect, it } from 'vitest';
import { HUB_HEIGHT_M, TIP_HEIGHT_M } from '../../../model/constants';
import { shearArrowLength, shearArrows, shearSpeed } from './shear';

const LONGEST = 240;

describe('shear profile', () => {
  it('follows the one seventh power law about hub height', () => {
    expect(shearSpeed(HUB_HEIGHT_M)).toBeCloseTo(1, 9);
    expect(shearSpeed(30)).toBeCloseTo((30 / 105) ** (1 / 7), 9);
  });

  it('draws the arrow at the tip height longest', () => {
    const lengths = shearArrows(LONGEST).map(({ length }) => length);
    expect(Math.max(...lengths)).toBeCloseTo(LONGEST, 9);
    expect(shearArrowLength(TIP_HEIGHT_M, LONGEST)).toBeCloseTo(LONGEST, 9);
    lengths.slice(1).forEach((length, index) => expect(length).toBeGreaterThan(lengths[index]));
  });
});

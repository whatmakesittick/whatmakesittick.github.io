import { describe, expect, it } from 'vitest';
import { DROPLET_UM, FLATTENED_UM, HAIR_UM } from './constants';
import { boxSpan, dropletDrawnM, lineWidthM, mm, patchWidthM, patternDrawnM } from './scale';

describe('scale', () => {
  it('draws the droplet inset 10,000 times larger', () => {
    expect(dropletDrawnM(DROPLET_UM)).toBeCloseTo(0.3, 9);
    expect(dropletDrawnM(FLATTENED_UM)).toBeCloseTo(1, 9);
    expect(dropletDrawnM(HAIR_UM)).toBeCloseTo(0.5, 9);
  });

  it('draws the pattern inset 5 million times larger', () => {
    expect(lineWidthM('na033')).toBeCloseTo(0.065, 9);
    expect(lineWidthM('na055')).toBeCloseTo(0.04, 9);
    expect(patchWidthM('na033')).toBeCloseTo(1.82, 9);
    expect(patternDrawnM(100)).toBeCloseTo(0.5, 9);
  });

  it('converts millimetres and spans a box', () => {
    expect(mm(152)).toBeCloseTo(0.152, 9);
    expect(boxSpan({ centre: [1, 2, 3], size: [2, 4, 6] })).toEqual({
      x: [0, 2],
      y: [0, 4],
      z: [0, 6],
    });
  });
});

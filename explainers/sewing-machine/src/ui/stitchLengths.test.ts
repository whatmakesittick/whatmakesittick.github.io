import { describe, expect, it } from 'vitest';
import { STITCH_LENGTH_MM, nearestStitchLength } from './stitchLengths';

describe('nearestStitchLength', () => {
  it('picks the preset that matches the stitch length', () => {
    expect(nearestStitchLength(STITCH_LENGTH_MM.short)).toBe('short');
    expect(nearestStitchLength(STITCH_LENGTH_MM.medium)).toBe('medium');
    expect(nearestStitchLength(STITCH_LENGTH_MM.long)).toBe('long');
  });

  it('picks the closest preset for lengths in between', () => {
    expect(nearestStitchLength(1)).toBe('short');
    expect(nearestStitchLength(3)).toBe('medium');
    expect(nearestStitchLength(5)).toBe('long');
  });

  it('breaks a tie toward the longer stitch', () => {
    expect(nearestStitchLength(2)).toBe('medium');
    expect(nearestStitchLength(3.25)).toBe('long');
  });
});

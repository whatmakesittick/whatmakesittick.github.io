import { describe, expect, it } from 'vitest';
import { ROW_LOD_DISTANCE_M } from './constants';
import { detailFor } from './detail';

describe('level of detail', () => {
  it('goes far beyond the row distance or on a coarse pointer', () => {
    expect(detailFor(ROW_LOD_DISTANCE_M, false)).toBe('near');
    expect(detailFor(ROW_LOD_DISTANCE_M + 1, false)).toBe('far');
    expect(detailFor(5, true)).toBe('far');
  });
});

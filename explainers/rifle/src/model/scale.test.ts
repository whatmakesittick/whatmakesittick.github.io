import { describe, expect, it } from 'vitest';
import { cm, contains, cutawayKeeps, mm, pad, union } from './scale';

const UNIT: ReturnType<typeof pad> = { x: [0, 1], y: [0, 1], z: [0, 1] };

describe('scale', () => {
  it('measures in millimetres', () => {
    expect(mm(415)).toBe(415);
    expect(cm(1)).toBe(10);
  });

  it('keeps the left half for the cutaway and removes the right side', () => {
    expect(cutawayKeeps(-1)).toBe(true);
    expect(cutawayKeeps(0)).toBe(true);
    expect(cutawayKeeps(1)).toBe(false);
  });

  it('tests, joins and pads boxes', () => {
    expect(contains(UNIT, [0.5, 0.5, 0.5])).toBe(true);
    expect(contains(UNIT, [1.5, 0.5, 0.5])).toBe(false);
    const joined = union([UNIT, { x: [2, 3], y: [-1, 0], z: [0, 1] }]);
    expect(joined).toEqual({ x: [0, 3], y: [-1, 1], z: [0, 1] });
    expect(pad(UNIT, 1)).toEqual({ x: [-1, 2], y: [-1, 2], z: [-1, 2] });
  });
});

import { describe, expect, it } from 'vitest';
import { ENGINE_EXTENT, PLUME_EXTENT, cm, contains, cutawayKeeps, m, pad, union } from './scale';

describe('scale', () => {
  it('measures the world in centimetres', () => {
    expect(cm(12)).toBe(12);
    expect(m(3.1)).toBeCloseTo(310, 9);
  });

  it('keeps the back half in the cutaway', () => {
    expect(cutawayKeeps(-1)).toBe(true);
    expect(cutawayKeeps(0)).toBe(true);
    expect(cutawayKeeps(1)).toBe(false);
  });

  it('hangs the engine from the gimbal and the plume below the nozzle', () => {
    expect(contains(ENGINE_EXTENT, [0, 0, 0])).toBe(true);
    expect(contains(ENGINE_EXTENT, [0, -310, 0])).toBe(true);
    expect(PLUME_EXTENT.y[1]).toBe(-310);
  });

  it('unions and pads boxes', () => {
    const box = union([ENGINE_EXTENT, PLUME_EXTENT]);
    expect(box.y).toEqual([PLUME_EXTENT.y[0], ENGINE_EXTENT.y[1]]);
    expect(pad(ENGINE_EXTENT, 4).x).toEqual([-84, 84]);
  });
});

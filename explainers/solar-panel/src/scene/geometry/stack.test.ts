import { describe, expect, it } from 'vitest';
import { MODULE } from '../../model';
import {
  CLOSED_FRONT_CM,
  STACK_LAYER_IDS,
  backsheetShift,
  frameDrop,
  layerFront,
  stackFront,
  stackLayout,
} from './stack';

describe('layer stack', () => {
  it('packs the closed laminate under the frame lip, glass in front', () => {
    const closed = stackLayout(0);
    expect(layerFront(closed.glass)).toBeCloseTo(CLOSED_FRONT_CM, 6);
    expect(closed.backsheet.back).toBeGreaterThan(0);
    expect(closed.backsheet.back).toBeLessThan(MODULE.depth);
    STACK_LAYER_IDS.slice(1).forEach((id, index) => {
      const behind = closed[STACK_LAYER_IDS[index]];
      expect(closed[id].back).toBeCloseTo(layerFront(behind), 6);
    });
  });

  it('separates and thickens the layers along the normal when exploded', () => {
    const open = stackLayout(1);
    expect(open.glass.thickness).toBeCloseTo(4, 6);
    expect(open.cellSheet.thickness).toBeCloseTo(2, 6);
    STACK_LAYER_IDS.slice(1).forEach((id, index) => {
      const behind = open[STACK_LAYER_IDS[index]];
      expect(open[id].back - layerFront(behind)).toBeGreaterThan(5);
    });
    expect(stackFront(1)).toBeGreaterThan(stackFront(0.5));
    expect(open.backsheet.back).toBeGreaterThan(MODULE.depth);
    expect(backsheetShift(1)).toBeGreaterThan(0);
  });

  it('drops the frame without pushing it through the terrace', () => {
    expect(frameDrop(0, 35)).toBe(0);
    expect(frameDrop(1, 90)).toBeLessThan(15);
    expect(frameDrop(1, 35)).toBeGreaterThan(frameDrop(1, 90));
    expect(frameDrop(1, 0)).toBe(frameDrop(1, 10));
  });
});

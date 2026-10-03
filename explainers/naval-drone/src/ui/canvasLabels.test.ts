import { describe, expect, it } from 'vitest';
import { intersects, placeText, segmentBoxes, shiftInto, textBox } from './canvasLabels';
import type { Box } from './canvasLabels';

const METRICS = { font: 10, ascent: 0.8, descent: 0.2 };
const BOUNDS: Box = { left: 0, top: 0, right: 200, bottom: 100 };

describe('canvas labels', () => {
  it('boxes a text around its anchor for each alignment', () => {
    expect(textBox(40, { x: 50, baseline: 30, align: 'left' }, METRICS)).toEqual({
      left: 50,
      right: 90,
      top: 22,
      bottom: 32,
    });
    expect(textBox(40, { x: 50, baseline: 30, align: 'center' }, METRICS).left).toBe(30);
    expect(textBox(40, { x: 50, baseline: 30, align: 'right' }, METRICS).left).toBe(10);
  });

  it('slides a label back inside the canvas sideways', () => {
    const anchor = { x: 190, baseline: 30, align: 'left' as const };
    const placed = shiftInto(textBox(40, anchor, METRICS), anchor, BOUNDS);
    expect(placed.box.right).toBe(200);
    expect(placed.x).toBe(160);
  });

  it('takes the first free spot inside the canvas and marks it taken', () => {
    const taken: Box[] = [{ left: 0, top: 20, right: 100, bottom: 40 }];
    const spot = placeText(
      40,
      [
        { x: 50, baseline: 30, align: 'center' },
        { x: 50, baseline: 4, align: 'center' },
        { x: 50, baseline: 60, align: 'center' },
      ],
      taken,
      BOUNDS,
      METRICS,
    );
    expect(spot.baseline).toBe(60);
    expect(taken).toHaveLength(2);
  });

  it('falls back to the first spot when none is free', () => {
    const spot = placeText(40, [{ x: 50, baseline: 30, align: 'left' }], [BOUNDS], BOUNDS, METRICS);
    expect(spot.baseline).toBe(30);
  });

  it('covers a sloping line with small boxes', () => {
    const boxes = segmentBoxes(0, 100, 25, (x) => x / 2, 1);
    expect(boxes).toHaveLength(4);
    expect(boxes[1]).toEqual({ left: 25, right: 50, top: 11.5, bottom: 26 });
    expect(intersects(boxes[0], { left: 10, right: 12, top: 5, bottom: 6 })).toBe(true);
    expect(intersects(boxes[0], { left: 10, right: 12, top: 40, bottom: 50 })).toBe(false);
  });
});

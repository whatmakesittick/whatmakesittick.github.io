import { describe, expect, it } from 'vitest';
import { gaugeClearsDock } from '../../widget/src/gaugeClearance.ts';

const box = (top: number, bottom: number, left = 0, right = 100) => ({
  top,
  bottom,
  left,
  right,
  width: right - left,
  height: bottom - top,
});

describe('gaugeClearsDock', () => {
  it('keeps the gauge when it ends a gap above the dock', () => {
    expect(gaugeClearsDock(box(10, 100), box(108, 200))).toBe(true);
  });

  it('hides the gauge when it reaches into the gap or the dock', () => {
    expect(gaugeClearsDock(box(10, 101), box(108, 200))).toBe(false);
    expect(gaugeClearsDock(box(10, 300), box(108, 200))).toBe(false);
  });

  it('keeps the gauge beside the dock or when either is not laid out', () => {
    expect(gaugeClearsDock(box(10, 300, 200, 300), box(108, 200, 0, 150))).toBe(true);
    expect(gaugeClearsDock(box(0, 0), box(108, 200))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { band, flatPolygon, offsetPolyline, pinToAxis } from './flat';

describe('flat helpers', () => {
  it('offsets a corner with a mitre', () => {
    const [start, corner, end] = offsetPolyline(
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      0.1,
    );
    expect(start[1]).toBeCloseTo(0.1, 9);
    expect(corner[0]).toBeCloseTo(0.9, 9);
    expect(corner[1]).toBeCloseTo(0.1, 9);
    expect(end[0]).toBeCloseTo(0.9, 9);
  });

  it('skips repeated points', () => {
    const offset = offsetPolyline(
      [
        [0, 0],
        [1, 0],
        [1, 0],
        [2, 0],
      ],
      0.2,
    );
    offset.forEach(([, y]) => expect(y).toBeCloseTo(0.2, 9));
  });

  it('slides an offset end back onto the centreline', () => {
    expect(pinToAxis([0.1, 0.5], [1, 1])).toEqual([0, 0.4]);
  });

  it('builds a closed band and fills it', () => {
    const outline = band(
      [
        [0, 0],
        [2, 0],
      ],
      0.1,
    );
    expect(outline).toHaveLength(4);
    const geometry = flatPolygon(outline, (a, b) => [a, b, 0]);
    expect(geometry.getIndex()!.count).toBe(6);
  });
});

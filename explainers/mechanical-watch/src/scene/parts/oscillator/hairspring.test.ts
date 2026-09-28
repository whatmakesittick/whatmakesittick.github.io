import { describe, expect, it } from 'vitest';
import { spiralPath } from '../../geometry/spiral';
import { hairspringSegments } from './hairspring';

function ends(balanceDeg: number) {
  const path = spiralPath(hairspringSegments(balanceDeg));
  const last = path.length - 2;
  return {
    inner: Math.atan2(path[1], path[0]),
    outer: { x: path[last], y: path[last + 1] },
  };
}

describe('hairspring', () => {
  it('keeps the stud end fixed while the balance swings', () => {
    const rest = ends(0).outer;
    [-280, -90, 120, 280].forEach((angle) => {
      const moved = ends(angle).outer;
      expect(moved.x).toBeCloseTo(rest.x, 5);
      expect(moved.y).toBeCloseTo(rest.y, 5);
    });
  });

  it('turns the collet end with the balance and changes the number of coils', () => {
    const rest = ends(0).inner;
    const turned = ends(90).inner;
    expect(Math.cos(turned - rest - Math.PI / 2)).toBeCloseTo(1, 5);
    const open = hairspringSegments(280)[1].sweep;
    const closed = hairspringSegments(-280)[1].sweep;
    expect(closed - open).toBeCloseTo((560 * Math.PI) / 180, 5);
  });
});

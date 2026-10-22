import { describe, expect, it } from 'vitest';
import { bracket, grown, towardViewer } from './bracket';
import type { Triangle } from './bracket';

const STYLE = { arrowLength: 0.3, arrowHalf: 0.1, stem: 0.4 } as const;
const SPEC = { line: 2, top: 9.75, bottom: 9.74, extension: [1.4, 2.1] } as const;

function signedArea([a, b, c]: Triangle): number {
  return ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}

describe('bracket', () => {
  const shape = bracket(SPEC, STYLE);

  it('points both arrows inward at the two edges', () => {
    const [upper, lower] = shape.arrows;
    expect(upper[0]).toEqual([2, 9.75]);
    expect(Math.min(...upper.map(([, y]) => y))).toBeCloseTo(9.75);
    expect(lower[0]).toEqual([2, 9.74]);
    expect(Math.max(...lower.map(([, y]) => y))).toBeCloseTo(9.74);
  });

  it('winds every arrow counter-clockwise so it faces the viewer', () => {
    shape.arrows.forEach((arrow) => expect(signedArea(arrow)).toBeGreaterThan(0));
  });

  it('draws both extension lines and the outer stems', () => {
    expect(shape.segments).toHaveLength(4);
    const [upperStem, lowerStem] = shape.segments.slice(2);
    expect(upperStem[1][1]).toBeCloseTo(9.75 + STYLE.arrowLength + STYLE.stem);
    expect(lowerStem[1][1]).toBeCloseTo(9.74 - STYLE.arrowLength - STYLE.stem);
  });

  it('grows a halo around an arrow without turning it over', () => {
    const arrow = shape.arrows[0];
    const halo = grown(arrow, 0.05);
    expect(signedArea(halo)).toBeGreaterThan(signedArea(arrow));
  });

  it('maps the left of travel to the viewer right for a head-on reader', () => {
    expect(towardViewer(-7.5)).toBe(7.5);
  });
});

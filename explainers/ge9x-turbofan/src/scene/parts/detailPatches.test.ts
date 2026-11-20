import { describe, expect, it } from 'vitest';
import { doorFrame, holeCount, wrapAngle } from './detailPatches';

describe('detail patch helpers', () => {
  it('wraps angles into half a turn either side of zero', () => {
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI * 0.5);
    expect(wrapAngle(0.3)).toBeCloseTo(0.3);
  });

  it('rounds the hole count to a whole number around the ring', () => {
    expect(holeCount(1.72, 0.02)).toBe(Math.round((2 * Math.PI * 1.72) / 0.02));
    expect(holeCount(0.001, 1)).toBe(1);
  });

  it('describes a door as a centre and half sizes', () => {
    const frame = doorFrame({ x: [-1, -0.6], angle: [0.2, 0.6], radius: 2 });
    expect(frame.centreX).toBeCloseTo(-0.8);
    expect(frame.halfX).toBeCloseTo(0.2);
    expect(frame.centreArc).toBeCloseTo(0.8);
    expect(frame.halfArc).toBeCloseTo(0.4);
  });

  it('keeps a door that crosses the seam on the short side', () => {
    const frame = doorFrame({ x: [0, 1], angle: [Math.PI - 0.1, Math.PI + 0.1], radius: 1 });
    expect(frame.halfArc).toBeCloseTo(0.1);
    expect(Math.abs(frame.centreArc)).toBeCloseTo(Math.PI, 1);
  });
});

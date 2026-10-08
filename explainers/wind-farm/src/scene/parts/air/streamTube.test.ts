import { describe, expect, it } from 'vitest';
import { lineRadius, lineSpeed, speedRatio, tubeRadius, upstreamRadius } from './streamTube';

const INDUCTION = 1 / 3;
const FAR = 1e6;
const DIGITS = 6;

describe('stream tube', () => {
  it('slows from the free stream to one minus a at the disc and one minus two a behind', () => {
    expect(speedRatio(INDUCTION, -FAR)).toBeCloseTo(1, DIGITS);
    expect(speedRatio(INDUCTION, 0)).toBeCloseTo(1 - INDUCTION, DIGITS);
    expect(speedRatio(INDUCTION, FAR)).toBeCloseTo(1 - 2 * INDUCTION, DIGITS);
  });

  it('keeps slowing all the way along the wind', () => {
    const speeds = [-4, -1, 0, 1, 4].map((xi) => speedRatio(INDUCTION, xi));
    speeds.slice(1).forEach((speed, index) => expect(speed).toBeLessThan(speeds[index]));
  });

  it('passes the disc edge at one rotor radius', () => {
    expect(tubeRadius(INDUCTION, 0)).toBeCloseTo(1, DIGITS);
    expect(lineRadius(INDUCTION, upstreamRadius(INDUCTION, 1), 0)).toBeCloseTo(1, DIGITS);
  });

  it('crosses the disc where the line was aimed', () => {
    [0.3, 0.8, 1.2, 1.7].forEach((disc) =>
      expect(lineRadius(INDUCTION, upstreamRadius(INDUCTION, disc), 0)).toBeCloseTo(disc, DIGITS),
    );
  });

  it('spreads a line through the disc by the square root of the speed ratio', () => {
    const upstream = upstreamRadius(INDUCTION, 0.5);
    [-3, 0, 2, FAR].forEach((xi) => {
      const radius = lineRadius(INDUCTION, upstream, xi);
      expect(radius).toBeCloseTo(upstream / Math.sqrt(speedRatio(INDUCTION, xi)), DIGITS);
      expect(lineSpeed(INDUCTION, upstream, xi) * radius ** 2).toBeCloseTo(upstream ** 2, DIGITS);
    });
    expect(lineRadius(INDUCTION, upstream, FAR)).toBeCloseTo(0.5 * Math.sqrt(2), DIGITS);
  });

  it('bends lines outside the disc less the further out they pass', () => {
    const swell = (disc: number) => {
      const upstream = upstreamRadius(INDUCTION, disc);
      return lineRadius(INDUCTION, upstream, FAR) - upstream;
    };
    expect(swell(1.2)).toBeGreaterThan(swell(1.6));
    expect(swell(1.6)).toBeGreaterThan(swell(3));
    expect(swell(3)).toBeGreaterThan(0);
  });

  it('keeps the outside flow near the free stream', () => {
    const upstream = upstreamRadius(INDUCTION, 1.6);
    expect(lineSpeed(INDUCTION, upstream, FAR)).toBeGreaterThan(speedRatio(INDUCTION, FAR));
    expect(lineSpeed(INDUCTION, upstreamRadius(INDUCTION, 20), FAR)).toBeCloseTo(1, 3);
  });

  it('leaves the flow straight and steady without induction', () => {
    [-2, 0, 3].forEach((xi) => {
      expect(lineRadius(0, 0.6, xi)).toBeCloseTo(0.6, DIGITS);
      expect(lineSpeed(0, 1.4, xi)).toBeCloseTo(1, DIGITS);
    });
  });
});

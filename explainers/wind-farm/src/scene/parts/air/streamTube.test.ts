import { describe, expect, it } from 'vitest';
import { ROTOR_RADIUS_M } from '../../../model/constants';
import { TURBINE_GEOMETRY } from '../../../model/layout';
import { STREAMLINES } from './constants';
import { StreamlineGeometry } from './streamlineGeometry';
import { speedRatio, tubeSpread } from './streamTube';

const INDUCTION = 1 / 3;
const FAR = 1e6;
const DIGITS = 6;
const INDUCTIONS = [0, 0.1, 0.25, INDUCTION, 0.9];
const AXIS_BOUND_M = 1.15 * ROTOR_RADIUS_M;
const LOWEST_M = 45;
const LINE_COUNT = 24;
const [HUB_X, HUB_Y, HUB_Z] = TURBINE_GEOMETRY.hub;

function shapedPoints(induction: number): number[][] {
  const lines = new StreamlineGeometry();
  lines.shape(induction);
  const position = lines.geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, index) => [
    position.getX(index),
    position.getY(index),
    position.getZ(index),
  ]);
}

function axisDistance([, y, z]: number[]): number {
  return Math.hypot(y - HUB_Y, z - HUB_Z);
}

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

  it('narrows upstream, passes the disc as aimed and widens behind it', () => {
    expect(tubeSpread(INDUCTION, -FAR)).toBeCloseTo(Math.sqrt(1 - INDUCTION), DIGITS);
    expect(tubeSpread(INDUCTION, 0)).toBeCloseTo(1, DIGITS);
    expect(tubeSpread(INDUCTION, FAR)).toBeCloseTo(Math.sqrt(2), DIGITS);
  });

  it('carries the same air through every section of the tube', () => {
    [-3, 0, 2, FAR].forEach((xi) =>
      expect(speedRatio(INDUCTION, xi) * tubeSpread(INDUCTION, xi) ** 2).toBeCloseTo(
        1 - INDUCTION,
        DIGITS,
      ),
    );
  });

  it('leaves the flow straight without induction', () => {
    [-2, 0, 3].forEach((xi) => expect(tubeSpread(0, xi)).toBeCloseTo(1, DIGITS));
  });
});

describe('streamlines', () => {
  it('draws 24 lines from x -450 to +900', () => {
    const lines = new StreamlineGeometry();
    expect(lines.lineCount).toBe(LINE_COUNT);
    const xs = shapedPoints(INDUCTION).map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(STREAMLINES.startX, DIGITS);
    expect(Math.max(...xs)).toBeCloseTo(STREAMLINES.endX, DIGITS);
  });

  it('keeps every point close to the hub axis and clear of the fields', () => {
    INDUCTIONS.forEach((induction) =>
      shapedPoints(induction).forEach((point) => {
        expect(axisDistance(point)).toBeLessThanOrEqual(AXIS_BOUND_M);
        expect(point[1]).toBeGreaterThan(LOWEST_M);
      }),
    );
  });

  it('enters upstream inside the rotor radius and crosses the disc inside it', () => {
    const points = shapedPoints(INDUCTION);
    const upstream = points.filter(([x]) => x === STREAMLINES.startX);
    const atDisc = points.filter(([x]) => Math.abs(x - HUB_X) < ROTOR_RADIUS_M / 10);
    [upstream, atDisc].forEach((section) => {
      expect(section.length).toBeGreaterThan(0);
      section.forEach((point) => expect(axisDistance(point)).toBeLessThan(ROTOR_RADIUS_M));
    });
  });

  it('widens the tube behind the disc', () => {
    const points = shapedPoints(INDUCTION);
    const reach = (x: number) =>
      Math.max(...points.filter(([px]) => px === x).map((point) => axisDistance(point)));
    expect(reach(STREAMLINES.endX)).toBeGreaterThan(reach(STREAMLINES.startX));
  });
});

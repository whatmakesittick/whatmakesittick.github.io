export type Knot = readonly [x: number, y: number];

export function interpolateKnots(knots: readonly Knot[], x: number): number {
  const first = knots[0];
  const last = knots[knots.length - 1];
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  const upper = knots.findIndex(([knotX]) => knotX >= x);
  const [x0, y0] = knots[upper - 1];
  const [x1, y1] = knots[upper];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export const POWER_CURVE: readonly Knot[] = [
  [3, 81],
  [4, 285],
  [5, 597],
  [6, 1062],
  [7, 1709],
  [8, 2545],
  [9, 3458],
  [10, 4038],
  [11, 4191],
  [12, 4200],
  [20, 4200],
  [20.5, 4186],
  [21, 3870],
  [22, 2745],
  [23, 1805],
  [24, 1283],
  [24.5, 1116],
];

export const THRUST_CURVE: readonly Knot[] = [
  [4, 0.83],
  [5, 0.82],
  [6, 0.82],
  [7, 0.8],
  [8, 0.79],
  [9, 0.7],
  [10, 0.54],
  [11, 0.39],
  [12, 0.29],
  [15, 0.15],
  [20, 0.06],
];

export const PITCH_KNOTS: readonly Knot[] = [
  [11, 0],
  [12, 4],
  [15, 12],
  [20, 20],
  [24.5, 27],
];

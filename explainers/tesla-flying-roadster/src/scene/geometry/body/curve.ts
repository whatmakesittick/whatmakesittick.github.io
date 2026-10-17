export type Knot = readonly [at: number, value: number];
export type Curve = (at: number) => number;
export type Vec2 = readonly [a: number, b: number];

const TANGENT_LIMIT = 3;
const BISECTION_STEPS = 40;

function secants(knots: readonly Knot[]): number[] {
  return knots
    .slice(1)
    .map(([at, value], index) => (value - knots[index][1]) / (at - knots[index][0]));
}

function monotoneTangents(knots: readonly Knot[]): number[] {
  const slopes = secants(knots);
  const tangents = knots.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === knots.length - 1) return slopes[index - 1];
    const [before, after] = [slopes[index - 1], slopes[index]];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const alpha = tangents[index] / slope;
    const beta = tangents[index + 1] / slope;
    const length = Math.hypot(alpha, beta);
    if (length <= TANGENT_LIMIT) return;
    const scale = TANGENT_LIMIT / length;
    tangents[index] = scale * alpha * slope;
    tangents[index + 1] = scale * beta * slope;
  });
  return tangents;
}

function spanOf(knots: readonly Knot[], at: number): number {
  let index = 0;
  while (index < knots.length - 2 && at > knots[index + 1][0]) index += 1;
  return index;
}

export function smoothCurve(knots: readonly Knot[]): Curve {
  const tangents = monotoneTangents(knots);
  const [first, last] = [knots[0], knots[knots.length - 1]];
  return (at) => {
    if (at <= first[0]) return first[1];
    if (at >= last[0]) return last[1];
    const index = spanOf(knots, at);
    const [[from, start], [to, end]] = [knots[index], knots[index + 1]];
    const width = to - from;
    const t = (at - from) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * start +
      (t3 - 2 * t2 + t) * width * tangents[index] +
      (-2 * t3 + 3 * t2) * end +
      (t3 - t2) * width * tangents[index + 1]
    );
  };
}

export function lerp2(from: Vec2, to: Vec2, share: number): Vec2 {
  return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
}

export function along(from: Vec2, direction: Vec2, distance: number): Vec2 {
  return [from[0] + direction[0] * distance, from[1] + direction[1] * distance];
}

export function direction(from: Vec2, to: Vec2): Vec2 {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length === 0) return [0, 0];
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
}

export function cubicPoint(points: readonly [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 {
  const [p0, p1, p2, p3] = points;
  const s = 1 - t;
  const [a, b, c, d] = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

export function quadraticPoint(points: readonly [Vec2, Vec2, Vec2], t: number): Vec2 {
  const [p0, p1, p2] = points;
  const s = 1 - t;
  const [a, b, c] = [s * s, 2 * s * t, t * t];
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
}

export function softRamp(value: number, knee: number): number {
  if (value <= 0) return 0;
  if (value >= 2 * knee) return value - knee;
  return (value * value) / (4 * knee);
}

export function solveIncreasing(read: Curve, target: number, from = 0, to = 1): number {
  let [low, high] = [from, to];
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (read(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

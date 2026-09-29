export type CurveKey = readonly [x: number, y: number];

export type Curve = (x: number) => number;

const MONOTONE_LIMIT = 3;
const BISECTION_TOLERANCE = 0.01;

function secants(keys: readonly CurveKey[]): number[] {
  return keys.slice(1).map(([x, y], index) => {
    const [previousX, previousY] = keys[index];
    return (y - previousY) / (x - previousX);
  });
}

function averageTangent(before: number, after: number): number {
  return before * after > 0 ? (before + after) / 2 : 0;
}

function limitTangents(tangents: number[], slopes: readonly number[]): void {
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const a = tangents[index] / slope;
    const b = tangents[index + 1] / slope;
    const length = Math.hypot(a, b);
    if (length <= MONOTONE_LIMIT) return;
    const scale = MONOTONE_LIMIT / length;
    tangents[index] = scale * a * slope;
    tangents[index + 1] = scale * b * slope;
  });
}

function monotoneTangents(slopes: readonly number[]): number[] {
  const inner = slopes.slice(1).map((slope, index) => averageTangent(slopes[index], slope));
  const tangents = [slopes[0], ...inner, slopes[slopes.length - 1]];
  limitTangents(tangents, slopes);
  return tangents;
}

function segmentIndex(keys: readonly CurveKey[], x: number): number {
  let index = 0;
  while (index < keys.length - 2 && x > keys[index + 1][0]) index += 1;
  return index;
}

function hermite(
  [x0, y0]: CurveKey,
  [x1, y1]: CurveKey,
  m0: number,
  m1: number,
  x: number,
): number {
  const width = x1 - x0;
  const t = (x - x0) / width;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * width * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * width * m1
  );
}

function clampedTo(keys: readonly CurveKey[], evaluate: Curve): Curve {
  const first = keys[0];
  const last = keys[keys.length - 1];
  return (x) => {
    if (x <= first[0]) return first[1];
    if (x >= last[0]) return last[1];
    return evaluate(x);
  };
}

export function monotoneCurve(keys: readonly CurveKey[]): Curve {
  const tangents = monotoneTangents(secants(keys));
  return clampedTo(keys, (x) => {
    const index = segmentIndex(keys, x);
    return hermite(keys[index], keys[index + 1], tangents[index], tangents[index + 1], x);
  });
}

export function linearCurve(keys: readonly CurveKey[]): Curve {
  return clampedTo(keys, (x) => {
    const index = segmentIndex(keys, x);
    const [x0, y0] = keys[index];
    const [x1, y1] = keys[index + 1];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  });
}

export function inverseMonotone(curve: Curve, y: number, [min, max]: CurveKey): number {
  let low = min;
  let high = max;
  if (y <= curve(low)) return low;
  if (y >= curve(high)) return high;
  while (high - low > BISECTION_TOLERANCE) {
    const middle = (low + high) / 2;
    if (curve(middle) < y) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

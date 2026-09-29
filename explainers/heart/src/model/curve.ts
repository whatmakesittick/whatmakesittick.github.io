export type CurvePoint = readonly [time: number, value: number];

export type Curve = (time: number) => number;

const MONOTONE_LIMIT = 3;

function unwrap(points: readonly CurvePoint[], period: number): CurvePoint[] {
  const unwrapped: CurvePoint[] = [];
  let offset = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const [time, value] of points) {
    if (time + offset <= previous) offset += period;
    previous = time + offset;
    unwrapped.push([previous, value]);
  }
  const [first] = unwrapped;
  const last = unwrapped[unwrapped.length - 1];
  if (last[0] - first[0] < period) unwrapped.push([first[0] + period, first[1]]);
  return unwrapped;
}

function secants(points: readonly CurvePoint[]): number[] {
  return points.slice(1).map(([time, value], index) => {
    const [previousTime, previousValue] = points[index];
    return (value - previousValue) / (time - previousTime);
  });
}

function averageTangent(before: number, after: number): number {
  return before * after > 0 ? (before + after) / 2 : 0;
}

function tangents(slopes: readonly number[]): number[] {
  const count = slopes.length;
  const seam = averageTangent(slopes[count - 1], slopes[0]);
  const result = [seam];
  for (let index = 1; index < count; index += 1) {
    result.push(averageTangent(slopes[index - 1], slopes[index]));
  }
  result.push(seam);
  for (let index = 0; index < count; index += 1) {
    const slope = slopes[index];
    if (slope === 0) {
      result[index] = 0;
      result[index + 1] = 0;
      continue;
    }
    const alpha = result[index] / slope;
    const beta = result[index + 1] / slope;
    const size = Math.hypot(alpha, beta);
    if (size > MONOTONE_LIMIT) {
      const scale = MONOTONE_LIMIT / size;
      result[index] = scale * alpha * slope;
      result[index + 1] = scale * beta * slope;
    }
  }
  return result;
}

function hermite(
  share: number,
  width: number,
  from: number,
  to: number,
  fromTangent: number,
  toTangent: number,
): number {
  const square = share * share;
  const cube = square * share;
  return (
    (2 * cube - 3 * square + 1) * from +
    (cube - 2 * square + share) * width * fromTangent +
    (-2 * cube + 3 * square) * to +
    (cube - square) * width * toTangent
  );
}

export function monotoneCurve(points: readonly CurvePoint[], period: number): Curve {
  const knots = unwrap(points, period);
  const slopes = secants(knots);
  const slopeAtKnot = tangents(slopes);
  const start = knots[0][0];
  return (time) => {
    const local = start + ((((time - start) % period) + period) % period);
    let index = 0;
    while (index < knots.length - 2 && knots[index + 1][0] <= local) index += 1;
    const [fromTime, from] = knots[index];
    const [toTime, to] = knots[index + 1];
    const width = toTime - fromTime;
    const share = (local - fromTime) / width;
    return hermite(share, width, from, to, slopeAtKnot[index], slopeAtKnot[index + 1]);
  };
}

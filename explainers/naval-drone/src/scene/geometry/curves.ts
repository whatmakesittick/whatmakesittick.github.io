const MONOTONE_LIMIT = 3;

function tangents(xs: readonly number[], ys: readonly number[]): number[] {
  const secants = xs.slice(1).map((x, index) => (ys[index + 1] - ys[index]) / (x - xs[index]));
  const slopes = xs.map((_, index) => {
    if (index === 0) return secants[0];
    if (index === xs.length - 1) return secants[secants.length - 1];
    const before = secants[index - 1];
    const after = secants[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  secants.forEach((secant, index) => {
    if (secant === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      return;
    }
    const a = slopes[index] / secant;
    const b = slopes[index + 1] / secant;
    const length = Math.hypot(a, b);
    if (length > MONOTONE_LIMIT) {
      slopes[index] = (MONOTONE_LIMIT / length) * a * secant;
      slopes[index + 1] = (MONOTONE_LIMIT / length) * b * secant;
    }
  });
  return slopes;
}

export function monotoneCubic(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const slopes = tangents(xs, ys);
  const last = xs.length - 1;
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[last]) return ys[last];
    let index = 0;
    while (index < last - 1 && x > xs[index + 1]) index += 1;
    const width = xs[index + 1] - xs[index];
    const t = (x - xs[index]) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[index] +
      (t3 - 2 * t2 + t) * width * slopes[index] +
      (-2 * t3 + 3 * t2) * ys[index + 1] +
      (t3 - t2) * width * slopes[index + 1]
    );
  };
}

export function spread(from: number, to: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, index) => from + ((to - from) * index) / steps);
}

export function mergeSorted(values: readonly number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || value - sorted[index - 1] > tolerance);
}

export type Key<T> = readonly [at: number, value: T];

function hermite(p0: number, p1: number, m0: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1
  );
}

function segmentIndex(keys: readonly Key<unknown>[], at: number): number {
  const index = keys.findIndex(([keyAt]) => at < keyAt);
  return index === -1 ? keys.length - 1 : Math.max(index - 1, 0);
}

function slope(before: Key<number>, after: Key<number>): number {
  return (after[1] - before[1]) / (after[0] - before[0]);
}

export function clampedCurve(keys: readonly Key<number>[], at: number): number {
  const last = keys.length - 1;
  if (at <= keys[0][0]) return keys[0][1];
  if (at >= keys[last][0]) return keys[last][1];
  const index = segmentIndex(keys, at);
  const from = keys[index];
  const to = keys[index + 1];
  const span = to[0] - from[0];
  const m0 = index === 0 ? 0 : slope(keys[index - 1], to) * span;
  const m1 = index + 1 === last ? 0 : slope(from, keys[index + 2]) * span;
  return hermite(from[1], to[1], m0, m1, (at - from[0]) / span);
}

export function periodicCurve(keys: readonly Key<number>[], period: number, at: number): number {
  const count = keys.length;
  const wrapped = ((at % period) + period) % period;
  const index = wrapped < keys[0][0] ? count - 1 : segmentIndex(keys, wrapped);
  const keyAt = (offset: number): Key<number> => {
    const raw = index + offset;
    const turns = Math.floor(raw / count);
    const [time, value] = keys[raw - turns * count];
    return [time + turns * period, value];
  };
  const before = keyAt(-1);
  const from = keyAt(0);
  const to = keyAt(1);
  const after = keyAt(2);
  const local = wrapped < from[0] ? wrapped + period : wrapped;
  const span = to[0] - from[0];
  return hermite(
    from[1],
    to[1],
    slope(before, to) * span,
    slope(from, after) * span,
    (local - from[0]) / span,
  );
}

export function periodicVector(
  keys: readonly Key<readonly [number, number, number]>[],
  period: number,
  at: number,
): [number, number, number] {
  const channel = (axis: number) =>
    periodicCurve(
      keys.map(([time, value]) => [time, value[axis]] as const),
      period,
      at,
    );
  return [channel(0), channel(1), channel(2)];
}

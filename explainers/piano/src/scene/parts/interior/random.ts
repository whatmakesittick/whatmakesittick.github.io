const RANDOM = {
  multiplier: 0x6d2b79f5,
  shiftA: 15,
  shiftB: 7,
  shiftC: 14,
  range: 4294967296,
} as const;

export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + RANDOM.multiplier) | 0;
    let value = Math.imul(state ^ (state >>> RANDOM.shiftA), 1 | state);
    value = (value + Math.imul(value ^ (value >>> RANDOM.shiftB), 61 | value)) ^ value;
    return ((value ^ (value >>> RANDOM.shiftC)) >>> 0) / RANDOM.range;
  };
}

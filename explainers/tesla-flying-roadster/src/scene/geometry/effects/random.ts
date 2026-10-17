const MULTIPLIER = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const UINT_RANGE = 4294967296;

export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + MULTIPLIER) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> SHIFT_A), value | 1);
    value ^= value + Math.imul(value ^ (value >>> SHIFT_B), value | 61);
    return ((value ^ (value >>> SHIFT_C)) >>> 0) / UINT_RANGE;
  };
}

export function between(random: Random, min: number, max: number): number {
  return min + (max - min) * random();
}

const UINT32 = 2 ** 32;
const MIX_STEP = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const ODD_A = 1;
const ODD_B = 61;
const HASH_X = 127.1;
const HASH_Y = 311.7;
const HASH_SEED = 74.7;
const HASH_SCALE = 43_758.5453;

export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + MIX_STEP) >>> 0;
    let mixed = Math.imul(state ^ (state >>> SHIFT_A), ODD_A | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SHIFT_B), ODD_B | mixed);
    return ((mixed ^ (mixed >>> SHIFT_C)) >>> 0) / UINT32;
  };
}

export function hash2(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * HASH_X + y * HASH_Y + seed * HASH_SEED) * HASH_SCALE;
  return value - Math.floor(value);
}

export function between(random: Random, [from, to]: readonly [number, number]): number {
  return from + (to - from) * random();
}

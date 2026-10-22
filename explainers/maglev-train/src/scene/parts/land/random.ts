const UINT32 = 2 ** 32;
const MIX_STEP = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const ODD_A = 1;
const ODD_B = 61;

export type Random = () => number;
export type Range = readonly [number, number];

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + MIX_STEP) >>> 0;
    let mixed = Math.imul(state ^ (state >>> SHIFT_A), ODD_A | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SHIFT_B), ODD_B | mixed);
    return ((mixed ^ (mixed >>> SHIFT_C)) >>> 0) / UINT32;
  };
}

export function between(random: Random, [from, to]: Range): number {
  return from + (to - from) * random();
}

export function pick<T>(random: Random, options: readonly T[]): T {
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}

export function weighted<T extends string>(
  random: Random,
  weights: Readonly<Record<T, number>>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

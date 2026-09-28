const SEED_MULTIPLIER = 48271;
const SEED_MODULUS = 2147483647;

export function seededRandom(seed: number): () => number {
  let state = seed % SEED_MODULUS || 1;
  return () => {
    state = (state * SEED_MULTIPLIER) % SEED_MODULUS;
    return state / SEED_MODULUS;
  };
}

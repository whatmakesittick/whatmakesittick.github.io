const HASH = { x: 127.1, y: 311.7, seed: 74.7, scale: 43758.5453 } as const;
const OCTAVE_GAIN = 0.5;
const OCTAVE_LACUNARITY = 2;

export function hash2(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * HASH.x + y * HASH.y + seed * HASH.seed) * HASH.scale;
  return value - Math.floor(value);
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function wrap(value: number, period: number): number {
  return period > 0 ? ((value % period) + period) % period : value;
}

export function valueNoise(x: number, y: number, seed = 0, period = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const corner = (dx: number, dy: number) =>
    hash2(wrap(x0 + dx, period), wrap(y0 + dy, period), seed);
  const bottom = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * tx;
  const top = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * tx;
  return bottom + (top - bottom) * ty;
}

export function fractalNoise(x: number, y: number, octaves: number, seed = 0, period = 0): number {
  let total = 0;
  let weight = 1;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += weight * valueNoise(x * frequency, y * frequency, seed + octave, period * frequency);
    norm += weight;
    weight *= OCTAVE_GAIN;
    frequency *= OCTAVE_LACUNARITY;
  }
  return total / norm;
}

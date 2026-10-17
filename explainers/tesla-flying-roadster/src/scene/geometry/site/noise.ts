const HASH = { x: 127.1, y: 311.7, seed: 74.7, scale: 43758.5453 } as const;
const OCTAVE_GAIN = 0.5;
const OCTAVE_LACUNARITY = 2;

type Corner = (column: number, row: number) => number;

export function hash2(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * HASH.x + y * HASH.y + seed * HASH.seed) * HASH.scale;
  return value - Math.floor(value);
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function smoothCell(x: number, y: number, corner: Corner): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const bottom = corner(x0, y0) + (corner(x0 + 1, y0) - corner(x0, y0)) * tx;
  const top = corner(x0, y0 + 1) + (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1)) * tx;
  return bottom + (top - bottom) * ty;
}

function octaveSum(count: number, sample: (octave: number, scale: number) => number): number {
  let total = 0;
  let weight = 1;
  let scale = 1;
  let norm = 0;
  for (let octave = 0; octave < count; octave += 1) {
    total += weight * sample(octave, scale);
    norm += weight;
    weight *= OCTAVE_GAIN;
    scale *= OCTAVE_LACUNARITY;
  }
  return total / norm;
}

export function fractalNoise(x: number, y: number, octaves: number, seed = 0): number {
  return octaveSum(octaves, (octave, scale) =>
    smoothCell(x * scale, y * scale, (column, row) => hash2(column, row, seed + octave)),
  );
}

export interface TileCells {
  u: number;
  v: number;
}

export type TileNoise = (u: number, v: number) => number;

function lattice(columns: number, rows: number, seed: number): TileNoise {
  const values = Float32Array.from({ length: columns * rows }, (_, index) =>
    hash2(index % columns, Math.floor(index / columns), seed),
  );
  const corner: Corner = (column, row) => values[(row % rows) * columns + (column % columns)];
  return (u, v) => smoothCell((u - Math.floor(u)) * columns, (v - Math.floor(v)) * rows, corner);
}

export function tileNoise(cells: TileCells, octaves: number, seed = 0): TileNoise {
  const layers = Array.from({ length: octaves }, (_, octave) =>
    lattice(
      cells.u * OCTAVE_LACUNARITY ** octave,
      cells.v * OCTAVE_LACUNARITY ** octave,
      seed + octave,
    ),
  );
  return (u, v) => octaveSum(octaves, (octave) => layers[octave](u, v));
}

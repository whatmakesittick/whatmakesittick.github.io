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

export function valueNoise(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const corner = (dx: number, dy: number) => hash2(x0 + dx, y0 + dy, seed);
  const bottom = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * tx;
  const top = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * tx;
  return bottom + (top - bottom) * ty;
}

export function fractalNoise(x: number, y: number, octaves: number, seed = 0): number {
  let total = 0;
  let weight = 1;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += weight * valueNoise(x * frequency, y * frequency, seed + octave);
    norm += weight;
    weight *= OCTAVE_GAIN;
    frequency *= OCTAVE_LACUNARITY;
  }
  return total / norm;
}

export interface TileCells {
  u: number;
  v: number;
}

interface Lattice {
  columns: number;
  rows: number;
  values: Float32Array;
  weight: number;
}

function lattice(columns: number, rows: number, seed: number, weight: number): Lattice {
  const values = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      values[row * columns + column] = hash2(column, row, seed);
    }
  }
  return { columns, rows, values, weight };
}

function sampleLattice({ columns, rows, values }: Lattice, u: number, v: number): number {
  const x = (u - Math.floor(u)) * columns;
  const y = (v - Math.floor(v)) * rows;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1 === columns ? 0 : x0 + 1;
  const y1 = y0 + 1 === rows ? 0 : y0 + 1;
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const bottom =
    values[y0 * columns + x0] + (values[y0 * columns + x1] - values[y0 * columns + x0]) * tx;
  const top =
    values[y1 * columns + x0] + (values[y1 * columns + x1] - values[y1 * columns + x0]) * tx;
  return bottom + (top - bottom) * ty;
}

export type TileNoise = (u: number, v: number) => number;

export function tileNoise(cells: TileCells, octaves: number, seed = 0): TileNoise {
  const layers: Lattice[] = [];
  let weight = 1;
  let scale = 1;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    layers.push(lattice(cells.u * scale, cells.v * scale, seed + octave, weight));
    norm += weight;
    weight *= OCTAVE_GAIN;
    scale *= OCTAVE_LACUNARITY;
  }
  return (u, v) => {
    let total = 0;
    for (const layer of layers) total += layer.weight * sampleLattice(layer, u, v);
    return total / norm;
  };
}

export const AXES = 3;
export const MATRIX = 9;

export function multiplyInto(
  out: Float64Array,
  outAt: number,
  a: Float64Array,
  aAt: number,
  b: Float64Array,
  bAt: number,
): void {
  for (let row = 0; row < AXES; row++) {
    const r = aAt + row * AXES;
    for (let col = 0; col < AXES; col++)
      out[outAt + row * AXES + col] =
        a[r] * b[bAt + col] + a[r + 1] * b[bAt + AXES + col] + a[r + 2] * b[bAt + 2 * AXES + col];
  }
}

export function eulerInto(out: Float64Array, outAt: number, x: number, y: number, z: number): void {
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  out[outAt] = cz * cy;
  out[outAt + 1] = cz * sy * sx - sz * cx;
  out[outAt + 2] = cz * sy * cx + sz * sx;
  out[outAt + 3] = sz * cy;
  out[outAt + 4] = sz * sy * sx + cz * cx;
  out[outAt + 5] = sz * sy * cx - cz * sx;
  out[outAt + 6] = -sy;
  out[outAt + 7] = cy * sx;
  out[outAt + 8] = cy * cx;
}

export function quaternionFromMatrix(
  m: Float64Array,
  at: number,
  out: Float32Array,
  outAt: number,
): void {
  const trace = m[at] + m[at + 4] + m[at + 8];
  let x: number;
  let y: number;
  let z: number;
  let w: number;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    w = s / 4;
    x = (m[at + 7] - m[at + 5]) / s;
    y = (m[at + 2] - m[at + 6]) / s;
    z = (m[at + 3] - m[at + 1]) / s;
  } else if (m[at] > m[at + 4] && m[at] > m[at + 8]) {
    const s = 2 * Math.sqrt(1 + m[at] - m[at + 4] - m[at + 8]);
    w = (m[at + 7] - m[at + 5]) / s;
    x = s / 4;
    y = (m[at + 1] + m[at + 3]) / s;
    z = (m[at + 2] + m[at + 6]) / s;
  } else if (m[at + 4] > m[at + 8]) {
    const s = 2 * Math.sqrt(1 + m[at + 4] - m[at] - m[at + 8]);
    w = (m[at + 2] - m[at + 6]) / s;
    x = (m[at + 1] + m[at + 3]) / s;
    y = s / 4;
    z = (m[at + 5] + m[at + 7]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m[at + 8] - m[at] - m[at + 4]);
    w = (m[at + 3] - m[at + 1]) / s;
    x = (m[at + 2] + m[at + 6]) / s;
    y = (m[at + 5] + m[at + 7]) / s;
    z = s / 4;
  }
  out[outAt] = x;
  out[outAt + 1] = y;
  out[outAt + 2] = z;
  out[outAt + 3] = w;
}

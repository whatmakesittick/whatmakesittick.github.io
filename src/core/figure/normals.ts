import { AXES } from './matrix';

export function computeNormals(
  positions: Float32Array,
  indices: Uint16Array,
  normals: Float32Array,
): void {
  normals.fill(0);
  for (let t = 0; t < indices.length; t += AXES) {
    const a = indices[t] * AXES;
    const b = indices[t + 1] * AXES;
    const c = indices[t + 2] * AXES;
    const e1x = positions[b] - positions[a];
    const e1y = positions[b + 1] - positions[a + 1];
    const e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a];
    const e2y = positions[c + 1] - positions[a + 1];
    const e2z = positions[c + 2] - positions[a + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    accumulate(normals, a, nx, ny, nz);
    accumulate(normals, b, nx, ny, nz);
    accumulate(normals, c, nx, ny, nz);
  }
  normalise(normals);
}

function accumulate(normals: Float32Array, at: number, x: number, y: number, z: number): void {
  normals[at] += x;
  normals[at + 1] += y;
  normals[at + 2] += z;
}

function normalise(normals: Float32Array): void {
  for (let i = 0; i < normals.length; i += AXES) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
}

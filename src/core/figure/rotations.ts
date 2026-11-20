export type Vec = readonly [number, number, number];
export type Mat = Float64Array;

const EPSILON = 1e-12;
const TURN = 2 * Math.PI;

export function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(a: Vec, k: number): Vec {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(a: Vec): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Vec): Vec {
  const l = length(a);
  return l < EPSILON ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}

export function angleBetween(a: Vec, b: Vec): number {
  return Math.atan2(length(cross(a, b)), dot(a, b));
}

export function midpoint(a: Vec, b: Vec): Vec {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

export function wrap(angle: number): number {
  return angle - TURN * Math.round(angle / TURN);
}

export function mixAngle(a: number, b: number, share: number): number {
  return a + wrap(b - a) * share;
}

export function smooth(value: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

export function identity(): Mat {
  return Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
}

export function mul(a: Mat, b: Mat): Mat {
  const out = new Float64Array(9);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return out;
}

export function transpose(a: Mat): Mat {
  return Float64Array.of(a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]);
}

export function apply(a: Mat, v: Vec): Vec {
  return [
    a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
    a[3] * v[0] + a[4] * v[1] + a[5] * v[2],
    a[6] * v[0] + a[7] * v[1] + a[8] * v[2],
  ];
}

export function applyTransposed(a: Mat, v: Vec): Vec {
  return [
    a[0] * v[0] + a[3] * v[1] + a[6] * v[2],
    a[1] * v[0] + a[4] * v[1] + a[7] * v[2],
    a[2] * v[0] + a[5] * v[1] + a[8] * v[2],
  ];
}

export function rotX(angle: number): Mat {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return Float64Array.of(1, 0, 0, 0, c, -s, 0, s, c);
}

export function rotY(angle: number): Mat {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return Float64Array.of(c, 0, s, 0, 1, 0, -s, 0, c);
}

export function rotZ(angle: number): Mat {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return Float64Array.of(c, -s, 0, s, c, 0, 0, 0, 1);
}

export function fromEuler(x: number, y: number, z: number): Mat {
  return mul(rotZ(z), mul(rotY(y), rotX(x)));
}

export function toEuler(m: Mat): Vec {
  const y = -Math.asin(Math.max(-1, Math.min(1, m[6])));
  return [Math.atan2(m[7], m[8]), y, Math.atan2(m[3], m[0])];
}

export function toEulerNear(m: Mat, twistCentre: number): Vec {
  const [x, y, z] = toEuler(m);
  return [twistCentre + wrap(x - twistCentre), y, z];
}

export function fromColumns(a: Vec, b: Vec, c: Vec): Mat {
  return Float64Array.of(a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]);
}

export function frame(primary: Vec, secondary: Vec): Mat {
  const first = normalize(primary);
  const second = normalize(sub(secondary, scale(first, dot(secondary, first))));
  return fromColumns(first, second, cross(first, second));
}

export function fromAxisAngle(axis: Vec, angle: number): Mat {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return Float64Array.of(
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  );
}

export function shortestArc(from: Vec, to: Vec): Mat {
  const axis = cross(from, to);
  const sin = length(axis);
  if (sin < EPSILON) return identity();
  return fromAxisAngle(scale(axis, 1 / sin), Math.atan2(sin, dot(from, to)));
}

export function rotationVector(m: Mat): Vec {
  const cos = Math.max(-1, Math.min(1, (m[0] + m[4] + m[8] - 1) / 2));
  const axis: Vec = [m[7] - m[5], m[2] - m[6], m[3] - m[1]];
  const sin = length(axis) / 2;
  if (sin < EPSILON) return [0, 0, 0];
  return scale(axis, Math.atan2(sin, cos) / (2 * sin));
}

export function fromQuaternion(x: number, y: number, z: number, w: number): Mat {
  const n = Math.hypot(x, y, z, w) || 1;
  const [qx, qy, qz, qw] = [x / n, y / n, z / n, w / n];
  return Float64Array.of(
    1 - 2 * (qy * qy + qz * qz),
    2 * (qx * qy - qz * qw),
    2 * (qx * qz + qy * qw),
    2 * (qx * qy + qz * qw),
    1 - 2 * (qx * qx + qz * qz),
    2 * (qy * qz - qx * qw),
    2 * (qx * qz - qy * qw),
    2 * (qy * qz + qx * qw),
    1 - 2 * (qx * qx + qy * qy),
  );
}

export function share(m: Mat, fraction: number): Mat {
  const vector = rotationVector(m);
  const angle = length(vector);
  return angle < EPSILON ? identity() : fromAxisAngle(scale(vector, 1 / angle), angle * fraction);
}

export function aimYZ(c: Vec, a: Vec): readonly [number, number] {
  const radius = Math.hypot(c[0], c[2]) || EPSILON;
  const phase = Math.atan2(c[0], c[2]);
  const spread = Math.acos(Math.max(-1, Math.min(1, a[2] / radius)));
  const first = wrap(-phase + spread);
  const second = wrap(-phase - spread);
  const y = Math.abs(first) <= Math.abs(second) ? first : second;
  const turned = apply(rotY(y), c);
  return [y, wrap(Math.atan2(a[1], a[0]) - Math.atan2(turned[1], turned[0]))];
}

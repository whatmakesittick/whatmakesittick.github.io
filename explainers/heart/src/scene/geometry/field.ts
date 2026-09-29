export type Vec3 = readonly [x: number, y: number, z: number];

export interface FieldBox {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface Field {
  readonly centre: Vec3;
  readonly reach: number;
  readonly box: FieldBox;
  distance(x: number, y: number, z: number): number;
}

const QUARTER = 0.25;
const GRADIENT_STEP_MM = 0.25;
const TINY = 1e-9;

export function expandBox(box: FieldBox, margin: number): FieldBox {
  return {
    min: [box.min[0] - margin, box.min[1] - margin, box.min[2] - margin],
    max: [box.max[0] + margin, box.max[1] + margin, box.max[2] + margin],
  };
}

export function boxAround(centre: Vec3, half: Vec3): FieldBox {
  return {
    min: [centre[0] - half[0], centre[1] - half[1], centre[2] - half[2]],
    max: [centre[0] + half[0], centre[1] + half[1], centre[2] + half[2]],
  };
}

function mergeBoxes(boxes: readonly FieldBox[]): FieldBox {
  return {
    min: [
      Math.min(...boxes.map((box) => box.min[0])),
      Math.min(...boxes.map((box) => box.min[1])),
      Math.min(...boxes.map((box) => box.min[2])),
    ],
    max: [
      Math.max(...boxes.map((box) => box.max[0])),
      Math.max(...boxes.map((box) => box.max[1])),
      Math.max(...boxes.map((box) => box.max[2])),
    ],
  };
}

function boxGapSquared(box: FieldBox, x: number, y: number, z: number): number {
  const dx = Math.max(box.min[0] - x, 0, x - box.max[0]);
  const dy = Math.max(box.min[1] - y, 0, y - box.max[1]);
  const dz = Math.max(box.min[2] - z, 0, z - box.max[2]);
  return dx * dx + dy * dy + dz * dz;
}

function beyondReach(box: FieldBox, x: number, y: number, z: number, limit: number): boolean {
  if (limit === Number.POSITIVE_INFINITY) return false;
  const gap = boxGapSquared(box, x, y, z);
  if (gap === 0) return false;
  return limit < 0 || gap > limit * limit;
}

function length3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

function normalise(vector: Vec3): Vec3 {
  const size = length3(...vector);
  return [vector[0] / size, vector[1] / size, vector[2] / size];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function smoothMin(a: number, b: number, smoothness: number): number {
  if (smoothness <= 0) return Math.min(a, b);
  const share = Math.max(smoothness - Math.abs(a - b), 0) / smoothness;
  return Math.min(a, b) - share * share * smoothness * QUARTER;
}

export function smoothMax(a: number, b: number, smoothness: number): number {
  return -smoothMin(-a, -b, smoothness);
}

interface Basis {
  readonly x: Vec3;
  readonly y: Vec3;
  readonly z: Vec3;
}

function basisAlong(axis: Vec3): Basis {
  const y = normalise(axis);
  const reference: Vec3 = Math.abs(y[0]) > 0.9 ? [0, 0, 1] : [1, 0, 0];
  const z = normalise(cross(reference, y));
  const x = cross(y, z);
  return { x, y, z };
}

export function ellipsoid(centre: Vec3, radii: Vec3, axis: Vec3 = [0, 1, 0]): Field {
  const { x: ax, y: ay, z: az } = basisAlong(axis);
  const [rx, ry, rz] = radii;
  const half = (index: number): number =>
    Math.hypot(ax[index] * rx, ay[index] * ry, az[index] * rz);
  return {
    centre,
    reach: Math.max(...radii),
    box: boxAround(centre, [half(0), half(1), half(2)]),
    distance(x, y, z) {
      const dx = x - centre[0];
      const dy = y - centre[1];
      const dz = z - centre[2];
      const lx = dx * ax[0] + dy * ax[1] + dz * ax[2];
      const ly = dx * ay[0] + dy * ay[1] + dz * ay[2];
      const lz = dx * az[0] + dy * az[1] + dz * az[2];
      const k0 = length3(lx / rx, ly / ry, lz / rz);
      const k1 = length3(lx / (rx * rx), ly / (ry * ry), lz / (rz * rz));
      if (k1 < TINY) return -Math.min(rx, ry, rz);
      return (k0 * (k0 - 1)) / k1;
    },
  };
}

export function roundCone(from: Vec3, to: Vec3, fromRadius: number, toRadius: number): Field {
  const bx = to[0] - from[0];
  const by = to[1] - from[1];
  const bz = to[2] - from[2];
  const l2 = bx * bx + by * by + bz * bz;
  const rr = fromRadius - toRadius;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const centre: Vec3 = [from[0] + bx / 2, from[1] + by / 2, from[2] + bz / 2];
  return {
    centre,
    reach: Math.sqrt(l2) / 2 + Math.max(fromRadius, toRadius),
    box: mergeBoxes([
      boxAround(from, [fromRadius, fromRadius, fromRadius]),
      boxAround(to, [toRadius, toRadius, toRadius]),
    ]),
    distance(x, y, z) {
      const px = x - from[0];
      const py = y - from[1];
      const pz = z - from[2];
      const along = px * bx + py * by + pz * bz;
      const beyond = along - l2;
      const qx = px * l2 - bx * along;
      const qy = py * l2 - by * along;
      const qz = pz * l2 - bz * along;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = along * along * l2;
      const z2 = beyond * beyond * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(beyond) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - toRadius;
      if (Math.sign(along) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - fromRadius;
      return (Math.sqrt(x2 * a2 * il2) + along * rr) * il2 - fromRadius;
    },
  };
}

export function squashed(field: Field, scale: Vec3): Field {
  const [cx, cy, cz] = field.centre;
  const [sx, sy, sz] = scale;
  const least = Math.min(sx, sy, sz);
  const scaleBound = (bound: Vec3): Vec3 => [
    cx + (bound[0] - cx) * sx,
    cy + (bound[1] - cy) * sy,
    cz + (bound[2] - cz) * sz,
  ];
  return {
    centre: field.centre,
    reach: field.reach * Math.max(sx, sy, sz),
    box: { min: scaleBound(field.box.min), max: scaleBound(field.box.max) },
    distance(x, y, z) {
      return field.distance(cx + (x - cx) / sx, cy + (y - cy) / sy, cz + (z - cz) / sz) * least;
    },
  };
}

export function cylinder(from: Vec3, to: Vec3, radius: number): Field {
  const bx = to[0] - from[0];
  const by = to[1] - from[1];
  const bz = to[2] - from[2];
  const baba = bx * bx + by * by + bz * bz;
  const half = Math.sqrt(baba) / 2;
  return {
    centre: [from[0] + bx / 2, from[1] + by / 2, from[2] + bz / 2],
    reach: Math.hypot(half, radius),
    box: mergeBoxes([
      boxAround(from, [radius, radius, radius]),
      boxAround(to, [radius, radius, radius]),
    ]),
    distance(x, y, z) {
      const px = x - from[0];
      const py = y - from[1];
      const pz = z - from[2];
      const paba = px * bx + py * by + pz * bz;
      const across =
        length3(px * baba - bx * paba, py * baba - by * paba, pz * baba - bz * paba) -
        radius * baba;
      const along = Math.abs(paba - baba * 0.5) - baba * 0.5;
      const across2 = across * across;
      const along2 = along * along * baba;
      const inside = Math.max(across, along) < 0;
      const squared = inside
        ? -Math.min(across2, along2)
        : (across > 0 ? across2 : 0) + (along > 0 ? along2 : 0);
      return (Math.sign(squared) * Math.sqrt(Math.abs(squared))) / baba;
    },
  };
}

export function sweptTube(points: readonly Vec3[], radii: readonly number[]): Field {
  const count = points.length - 1;
  const starts = new Float64Array(count * 3);
  const spans = new Float64Array(count * 3);
  const lengths = new Float64Array(count);
  for (let segment = 0; segment < count; segment += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      starts[segment * 3 + axis] = points[segment][axis];
      spans[segment * 3 + axis] = points[segment + 1][axis] - points[segment][axis];
    }
    const sx = spans[segment * 3];
    const sy = spans[segment * 3 + 1];
    const sz = spans[segment * 3 + 2];
    lengths[segment] = sx * sx + sy * sy + sz * sz || 1;
  }
  const widest = Math.max(...radii);
  const box = mergeBoxes(points.map((point) => boxAround(point, [widest, widest, widest])));
  return {
    centre: [
      (box.min[0] + box.max[0]) / 2,
      (box.min[1] + box.max[1]) / 2,
      (box.min[2] + box.max[2]) / 2,
    ],
    reach: length3(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]) / 2,
    box,
    distance(x, y, z) {
      let nearest = Number.POSITIVE_INFINITY;
      for (let segment = 0; segment < count; segment += 1) {
        const offset = segment * 3;
        const px = x - starts[offset];
        const py = y - starts[offset + 1];
        const pz = z - starts[offset + 2];
        const sx = spans[offset];
        const sy = spans[offset + 1];
        const sz = spans[offset + 2];
        const share = Math.min(Math.max((px * sx + py * sy + pz * sz) / lengths[segment], 0), 1);
        const radius = radii[segment] + (radii[segment + 1] - radii[segment]) * share;
        const gap = length3(px - sx * share, py - sy * share, pz - sz * share) - radius;
        if (gap < nearest) nearest = gap;
      }
      return nearest;
    },
  };
}

export function capsule(from: Vec3, to: Vec3, radius: number): Field {
  return roundCone(from, to, radius, radius);
}

function enclosing(fields: readonly Field[]): { centre: Vec3; reach: number } {
  const count = fields.length;
  const centre: Vec3 = [
    fields.reduce((sum, field) => sum + field.centre[0], 0) / count,
    fields.reduce((sum, field) => sum + field.centre[1], 0) / count,
    fields.reduce((sum, field) => sum + field.centre[2], 0) / count,
  ];
  const reach = Math.max(
    ...fields.map(
      (field) =>
        length3(
          field.centre[0] - centre[0],
          field.centre[1] - centre[1],
          field.centre[2] - centre[2],
        ) + field.reach,
    ),
  );
  return { centre, reach };
}

export function blend(fields: readonly Field[], smoothness: number): Field {
  const { centre, reach } = enclosing(fields);
  return {
    centre,
    reach,
    box: expandBox(mergeBoxes(fields.map((field) => field.box)), smoothness * QUARTER),
    distance(x, y, z) {
      let nearest = Number.POSITIVE_INFINITY;
      for (const field of fields) {
        if (beyondReach(field.box, x, y, z, nearest + smoothness)) continue;
        nearest = smoothMin(nearest, field.distance(x, y, z), smoothness);
      }
      return nearest;
    },
  };
}

export function union(fields: readonly Field[]): Field {
  return blend(fields, 0);
}

export function carve(base: Field, tools: readonly Field[], smoothness: number): Field {
  return {
    centre: base.centre,
    reach: base.reach,
    box: base.box,
    distance(x, y, z) {
      let distance = base.distance(x, y, z);
      for (const tool of tools) {
        if (beyondReach(tool.box, x, y, z, smoothness + Math.max(0, -distance))) continue;
        distance = smoothMax(distance, -tool.distance(x, y, z), smoothness);
      }
      return distance;
    },
  };
}

export function gradient(field: Field, x: number, y: number, z: number): Vec3 {
  const step = GRADIENT_STEP_MM;
  const gx = field.distance(x + step, y, z) - field.distance(x - step, y, z);
  const gy = field.distance(x, y + step, z) - field.distance(x, y - step, z);
  const gz = field.distance(x, y, z + step) - field.distance(x, y, z - step);
  const size = length3(gx, gy, gz) || 1;
  return [gx / size, gy / size, gz / size];
}

export function projectOnto(field: Field, point: Vec3, offset = 0, steps = 3): Vec3 {
  let [x, y, z] = point;
  for (let step = 0; step < steps; step += 1) {
    const distance = field.distance(x, y, z) - offset;
    const [gx, gy, gz] = gradient(field, x, y, z);
    x -= gx * distance;
    y -= gy * distance;
    z -= gz * distance;
  }
  return [x, y, z];
}

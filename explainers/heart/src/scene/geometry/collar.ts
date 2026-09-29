import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import type { Vec3 } from './field';

export interface CollarStyle {
  readonly radiusMm: number;
  readonly radialSegments: number;
  readonly spacingMm: number;
  readonly smoothing: number;
}

const XYZ = 3;
const HALF = 0.5;

export function loopNormal(points: readonly Vector3[]): Vector3 {
  const normal = new Vector3();
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    normal.x += (point.y - next.y) * (point.z + next.z);
    normal.y += (point.z - next.z) * (point.x + next.x);
    normal.z += (point.x - next.x) * (point.y + next.y);
  });
  return normal.normalize();
}

export function smoothLoop(points: readonly Vector3[], passes: number): Vector3[] {
  let current = points.map((point) => point.clone());
  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((point, index) => {
      const before = current[(index - 1 + current.length) % current.length];
      const after = current[(index + 1) % current.length];
      return point
        .clone()
        .multiplyScalar(HALF)
        .addScaledVector(before.clone().add(after), HALF * HALF);
    });
  }
  return current;
}

export function resampleLoop(points: readonly Vector3[], spacingMm: number): Vector3[] {
  const lengths = [0];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    lengths.push(lengths[index] + point.distanceTo(next));
  });
  const total = lengths[points.length];
  const count = Math.max(8, Math.round(total / spacingMm));
  const result: Vector3[] = [];
  let segment = 0;
  for (let step = 0; step < count; step += 1) {
    const at = (total * step) / count;
    while (lengths[segment + 1] < at) segment += 1;
    const span = lengths[segment + 1] - lengths[segment] || 1;
    const share = (at - lengths[segment]) / span;
    result.push(points[segment].clone().lerp(points[(segment + 1) % points.length], share));
  }
  return result;
}

export function collarLoop(raw: readonly Vector3[], style: CollarStyle): Vector3[] {
  return resampleLoop(smoothLoop(raw, style.smoothing), style.spacingMm);
}

export function collarGeometry(
  loop: readonly Vector3[],
  style: CollarStyle,
  colour: string,
): BufferGeometry {
  const up = loopNormal(loop);
  const tint = new Color(colour);
  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const index: number[] = [];
  const count = loop.length;
  loop.forEach((point, row) => {
    const tangent = loop[(row + 1) % count]
      .clone()
      .sub(loop[(row - 1 + count) % count])
      .normalize();
    const side = new Vector3().crossVectors(tangent, up).normalize();
    const lift = new Vector3().crossVectors(side, tangent).normalize();
    for (let segment = 0; segment < style.radialSegments; segment += 1) {
      const angle = (segment / style.radialSegments) * Math.PI * 2;
      const direction = side
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(lift, Math.sin(angle));
      const position = point.clone().addScaledVector(direction, style.radiusMm);
      positions.push(position.x, position.y, position.z);
      normals.push(direction.x, direction.y, direction.z);
      colours.push(tint.r, tint.g, tint.b);
    }
  });
  const stride = style.radialSegments;
  for (let row = 0; row < count; row += 1) {
    const next = (row + 1) % count;
    for (let segment = 0; segment < stride; segment += 1) {
      const turn = (segment + 1) % stride;
      const a = row * stride + segment;
      const b = row * stride + turn;
      const c = next * stride + turn;
      const d = next * stride + segment;
      index.push(a, d, c, a, c, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), XYZ));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), XYZ));
  geometry.setIndex(index);
  return geometry;
}

export function loopPoints(loop: readonly Vector3[]): Vec3[] {
  const closed = [...loop, loop[0]];
  return closed.map((point) => [point.x, point.y, point.z]);
}

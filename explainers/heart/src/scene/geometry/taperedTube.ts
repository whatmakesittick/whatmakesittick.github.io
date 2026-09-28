import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

export interface TaperedTubeSpec {
  readonly points: readonly Vector3[];
  readonly radius: (share: number) => number;
  readonly radialSegments: number;
}

const XYZ = 3;

function frames(
  points: readonly Vector3[],
): { tangent: Vector3; normal: Vector3; binormal: Vector3 }[] {
  const result: { tangent: Vector3; normal: Vector3; binormal: Vector3 }[] = [];
  let normal = new Vector3();
  points.forEach((_, index) => {
    const before = points[Math.max(index - 1, 0)];
    const after = points[Math.min(index + 1, points.length - 1)];
    const tangent = after.clone().sub(before).normalize();
    if (index === 0) {
      const helper = Math.abs(tangent.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      normal = new Vector3().crossVectors(tangent, helper).normalize();
    } else {
      normal = normal.clone().addScaledVector(tangent, -normal.dot(tangent)).normalize();
    }
    result.push({ tangent, normal, binormal: new Vector3().crossVectors(tangent, normal) });
  });
  return result;
}

export function taperedTube(spec: TaperedTubeSpec): BufferGeometry {
  const { points, radialSegments } = spec;
  const positions: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  const ring = frames(points);
  const last = points.length - 1;
  points.forEach((point, row) => {
    const radius = spec.radius(row / last);
    const { normal, binormal } = ring[row];
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const direction = normal
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(binormal, Math.sin(angle));
      const position = point.clone().addScaledVector(direction, radius);
      positions.push(position.x, position.y, position.z);
      normals.push(direction.x, direction.y, direction.z);
    }
  });
  const stride = radialSegments + 1;
  for (let row = 0; row < last; row += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const a = row * stride + segment;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      index.push(a, b, c, a, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), XYZ));
  geometry.setIndex(index);
  return geometry;
}

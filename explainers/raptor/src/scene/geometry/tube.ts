import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three';
import type { Point } from '../../model';

export type TubeArc = 'whole' | 'back';

export interface TubeOptions {
  radius: number | ((share: number) => number);
  samples: number;
  radial: number;
  arc?: TubeArc;
}

const XYZ = 3;
const PARALLEL = 1e-6;
const AXIS_Z = new Vector3(0, 0, 1);
const AXIS_X = new Vector3(1, 0, 0);

export function curveThrough(points: readonly Point[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    'centripetal',
  );
}

export function frameNormal(tangent: Vector3, target: Vector3): Vector3 {
  target.crossVectors(AXIS_Z, tangent);
  if (target.lengthSq() < PARALLEL) target.crossVectors(AXIS_X, tangent);
  return target.normalize();
}

function radiusAt(radius: TubeOptions['radius'], share: number): number {
  return typeof radius === 'number' ? radius : radius(share);
}

export function tubeAlong(points: readonly Point[], options: TubeOptions): BufferGeometry {
  const curve = curveThrough(points);
  const arcStart = options.arc === 'back' ? Math.PI : 0;
  const arcLength = options.arc === 'back' ? Math.PI : Math.PI * 2;
  const radial = options.arc === 'back' ? Math.ceil(options.radial / 2) : options.radial;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const point = new Vector3();
  const tangent = new Vector3();
  const normal = new Vector3();
  const binormal = new Vector3();
  const direction = new Vector3();
  for (let index = 0; index <= options.samples; index += 1) {
    const share = index / options.samples;
    curve.getPointAt(share, point);
    curve.getTangentAt(share, tangent);
    frameNormal(tangent, normal);
    binormal.crossVectors(tangent, normal);
    const radius = radiusAt(options.radius, share);
    for (let step = 0; step <= radial; step += 1) {
      const angle = arcStart + (arcLength * step) / radial;
      direction
        .copy(normal)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(binormal, Math.sin(angle));
      positions.push(
        point.x + direction.x * radius,
        point.y + direction.y * radius,
        point.z + direction.z * radius,
      );
      normals.push(direction.x, direction.y, direction.z);
      uvs.push(step / radial, share);
    }
  }
  const indices: number[] = [];
  const row = radial + 1;
  for (let index = 0; index < options.samples; index += 1) {
    for (let step = 0; step < radial; step += 1) {
      const a = index * row + step;
      const b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

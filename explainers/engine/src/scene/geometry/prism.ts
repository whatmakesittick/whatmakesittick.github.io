import { ExtrudeGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, Color, Shape } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { CREASE_ANGLE, CURVE_SEGMENTS } from '../constants';
import type { Frame } from '../layout';
import { fullShape, halfShape } from './profiles';
import type { SectionProfile } from './profiles';

export interface ExtrudeOptions {
  bevel?: number;
  curveSegments?: number;
}

const BEVEL_SEGMENTS = 2;
const XYZ = 3;
const TRIANGLE = 3;
const ALIGNED = 0.999;
const PLANE_EPSILON = 1e-3;

export function withCreasedNormals(geometry: BufferGeometry): BufferGeometry {
  const creased = toCreasedNormals(geometry, CREASE_ANGLE);
  if (creased !== geometry) geometry.dispose();
  return creased;
}

export function extrudeBetween(
  shapes: Shape | Shape[],
  frame: Frame,
  start: number,
  end: number,
  options: ExtrudeOptions = {},
): BufferGeometry {
  const bevel = options.bevel ?? 0;
  const geometry = new ExtrudeGeometry(shapes, {
    depth: end - start - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: options.curveSegments ?? CURVE_SEGMENTS,
  });
  geometry.translate(0, 0, start + bevel);
  geometry.applyMatrix4(new Matrix4().makeBasis(frame.u, frame.v, frame.w));
  return withCreasedNormals(geometry);
}

function keptRange(frame: Frame, cutNormal: Vector3, start: number, end: number): number[] | null {
  const facing = frame.w.dot(cutNormal);
  const range = facing > 0 ? [start, Math.min(end, 0)] : [Math.max(start, 0), end];
  return range[1] > range[0] ? range : null;
}

export function staticPrism(
  profile: SectionProfile,
  frame: Frame,
  start: number,
  end: number,
  cutNormal: Vector3 | null,
): BufferGeometry | null {
  if (!cutNormal) return extrudeBetween(fullShape(profile), frame, start, end);
  if (frame.v.dot(cutNormal) < -ALIGNED) {
    return extrudeBetween(halfShape(profile), frame, start, end);
  }
  if (Math.abs(frame.w.dot(cutNormal)) > ALIGNED) {
    const range = keptRange(frame, cutNormal, start, end);
    return range ? extrudeBetween(fullShape(profile), frame, range[0], range[1]) : null;
  }
  throw new Error('Section profile cannot be cut along its own axis');
}

function isOnCutPlane(positions: ArrayLike<number>, offset: number, cutNormal: Vector3): boolean {
  for (let vertex = 0; vertex < TRIANGLE; vertex++) {
    const index = (offset + vertex) * XYZ;
    const distance =
      positions[index] * cutNormal.x +
      positions[index + 1] * cutNormal.y +
      positions[index + 2] * cutNormal.z;
    if (Math.abs(distance) > PLANE_EPSILON) return false;
  }
  return true;
}

const faceA = new Vector3();
const faceB = new Vector3();
const faceC = new Vector3();

function faceNormal(positions: ArrayLike<number>, offset: number): Vector3 {
  const read = (target: Vector3, vertex: number) => {
    const index = (offset + vertex) * XYZ;
    return target.set(positions[index], positions[index + 1], positions[index + 2]);
  };
  read(faceA, 0);
  read(faceB, 1).sub(faceA);
  read(faceC, 2).sub(faceA);
  return faceB.cross(faceC).normalize();
}

export function paintSurfaces(
  geometry: BufferGeometry,
  body: Color,
  cut: Color,
  cutNormal: Vector3 | null,
): BufferGeometry {
  const positions = geometry.getAttribute('position').array;
  const vertexCount = positions.length / XYZ;
  const colors = new Float32Array(vertexCount * XYZ);
  for (let offset = 0; offset < vertexCount; offset += TRIANGLE) {
    const onCut =
      cutNormal !== null &&
      faceNormal(positions, offset).dot(cutNormal) > ALIGNED &&
      isOnCutPlane(positions, offset, cutNormal);
    const color = onCut ? cut : body;
    for (let vertex = 0; vertex < TRIANGLE; vertex++) {
      color.toArray(colors, (offset + vertex) * XYZ);
    }
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, XYZ));
  return geometry;
}

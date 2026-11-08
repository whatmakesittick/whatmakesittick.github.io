import { BufferGeometry, Float32BufferAttribute, MathUtils, Vector3 } from 'three';
import type { BufferAttribute, InterleavedBufferAttribute } from 'three';

type Positions = BufferAttribute | InterleavedBufferAttribute;

const KEY_PRECISION = 1e4;
const CORNERS = 3;
const XYZ = 3;

interface OpenEdge {
  start: number;
  end: number;
  normal: Vector3;
}

function pointKey({ x, y, z }: Vector3): string {
  return [x, y, z].map((value) => Math.round(value * KEY_PRECISION)).join(',');
}

function readFace(geometry: BufferGeometry, first: number, points: readonly Vector3[]): number[] {
  const index = geometry.getIndex();
  return points.map((point, corner) => {
    const vertex = index ? index.getX(first + corner) : first + corner;
    point.fromBufferAttribute(geometry.getAttribute('position'), vertex);
    return vertex;
  });
}

function faceNormal([a, b, c]: readonly Vector3[], side: Vector3, target: Vector3): Vector3 {
  return target.subVectors(c, b).cross(side.subVectors(a, b)).normalize();
}

function pushSegment(segments: number[], from: Vector3, to: Vector3): void {
  segments.push(from.x, from.y, from.z, to.x, to.y, to.z);
}

function pushBorders(segments: number[], open: Iterable<OpenEdge | null>, position: Positions) {
  const [from, to] = [new Vector3(), new Vector3()];
  for (const edge of open) {
    if (!edge) continue;
    from.fromBufferAttribute(position, edge.start);
    to.fromBufferAttribute(position, edge.end);
    pushSegment(segments, from, to);
  }
}

export function edgeSegments(geometry: BufferGeometry, thresholdDegrees: number): number[] {
  const cornerCount = (geometry.getIndex() ?? geometry.getAttribute('position')).count;
  const minimumDot = Math.cos(MathUtils.degToRad(thresholdDegrees));
  const points = [new Vector3(), new Vector3(), new Vector3()];
  const [normal, side] = [new Vector3(), new Vector3()];
  const open = new Map<string, OpenEdge | null>();
  const segments: number[] = [];
  for (let first = 0; first < cornerCount; first += CORNERS) {
    const vertices = readFace(geometry, first, points);
    const keys = points.map(pointKey);
    if (new Set(keys).size < CORNERS) continue;
    faceNormal(points, side, normal);
    points.forEach((point, corner) => {
      const next = (corner + 1) % CORNERS;
      const reverseKey = `${keys[next]}_${keys[corner]}`;
      const reverse = open.get(reverseKey);
      const forwardKey = `${keys[corner]}_${keys[next]}`;
      if (reverse) {
        if (normal.dot(reverse.normal) <= minimumDot) pushSegment(segments, point, points[next]);
        open.set(reverseKey, null);
      } else if (!open.has(forwardKey)) {
        const [start, end] = [vertices[corner], vertices[next]];
        open.set(forwardKey, { start, end, normal: normal.clone() });
      }
    });
  }
  pushBorders(segments, open.values(), geometry.getAttribute('position'));
  return segments;
}

export function edgeGeometry(geometry: BufferGeometry, thresholdDegrees: number): BufferGeometry {
  const positions = edgeSegments(geometry, thresholdDegrees);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, XYZ));
}

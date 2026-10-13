import { CatmullRomCurve3, ExtrudeGeometry, Shape, TubeGeometry, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import type { Vec3 } from './builder';

export type Outline = readonly (readonly [x: number, y: number])[];

export interface Span {
  from: number;
  to: number;
}

const CURVE_SEGMENTS = 8;
const BEVEL_SEGMENTS = 3;
const TUBE_RADIAL = 10;
const TUBE_STEPS_PER_POINT = 10;
const ROUNDING_STEPS = 4;

function lerpPoint(from: Vector2, to: Vector2, share: number): Vector2 {
  return from.clone().lerp(to, share);
}

export function roundedOutline(points: Outline, radius: number): Shape {
  const corners = points.map(([x, y]) => new Vector2(x, y));
  const shape = new Shape();
  corners.forEach((corner, index) => {
    const previous = corners[(index + corners.length - 1) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const inShare = Math.min(0.5, radius / corner.distanceTo(previous));
    const outShare = Math.min(0.5, radius / corner.distanceTo(next));
    const start = lerpPoint(corner, previous, inShare);
    const end = lerpPoint(corner, next, outShare);
    if (index === 0) shape.moveTo(start.x, start.y);
    else shape.lineTo(start.x, start.y);
    shape.quadraticCurveTo(corner.x, corner.y, end.x, end.y);
  });
  shape.closePath();
  return shape;
}

export function rectShape(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  radius: number,
): Shape {
  return roundedRectShape({ minA: minX, minB: minY, maxA: maxX, maxB: maxY }, radius);
}

export function extrudeAlongZ(
  shape: Shape,
  depth: Span,
  bevel = 0,
  curveSegments = CURVE_SEGMENTS,
): BufferGeometry {
  const thickness = depth.to - depth.from;
  const bevelDepth = Math.min(bevel, thickness / 3);
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - 2 * bevelDepth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevelDepth,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments,
  });
  geometry.translate(0, 0, depth.from + bevelDepth);
  return geometry;
}

export function tubeThrough(points: readonly Vec3[], radius: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  return new TubeGeometry(curve, points.length * TUBE_STEPS_PER_POINT, radius, TUBE_RADIAL, false);
}

export function starShape(teeth: number, tip: number, root: number, phase: number): Shape {
  const shape = new Shape();
  const step = (Math.PI * 2) / teeth;
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    for (let sample = 0; sample <= ROUNDING_STEPS; sample += 1) {
      const share = sample / ROUNDING_STEPS;
      const angle = phase + step * (tooth + share);
      const lift = Math.sin(share * Math.PI) ** 2;
      const radius = root + (tip - root) * lift;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (tooth === 0 && sample === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

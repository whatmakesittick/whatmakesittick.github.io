import {
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp } from '@core/math';
import { clampedCurve } from '../../rig/curve';
import { FOOT, HAND, HEAD, LIMB_SEGMENTS, LIMBS, TORSO } from './shapes';
import type { LimbId } from './shapes';

const QUARTER = Math.PI / 2;
const XYZ = 3;

function limbRadius(limb: (typeof LIMBS)[LimbId], share: number): number {
  const [start, bulge, end] = limb.radii;
  return share < limb.bulgeAt
    ? lerp(start, bulge, Math.sin((QUARTER * share) / limb.bulgeAt))
    : lerp(bulge, end, ((share - limb.bulgeAt) / (1 - limb.bulgeAt)) ** 1.4);
}

export function limbGeometry(id: LimbId): BufferGeometry {
  const limb = LIMBS[id];
  const { caps, body, radial } = LIMB_SEGMENTS;
  const [start, , end] = limb.radii;
  const points: Vector2[] = [];
  for (let step = 0; step <= caps; step++) {
    const angle = -QUARTER + (QUARTER * step) / caps;
    points.push(new Vector2(start * Math.cos(angle), start * Math.sin(angle)));
  }
  for (let step = 1; step < body; step++) {
    const share = step / body;
    points.push(new Vector2(limbRadius(limb, share), share * limb.length));
  }
  for (let step = 0; step <= caps; step++) {
    const angle = (QUARTER * step) / caps;
    points.push(
      new Vector2(Math.max(end * Math.cos(angle), 1e-4), limb.length + end * Math.sin(angle)),
    );
  }
  return new LatheGeometry(points, radial);
}

export function ellipsoid(radii: readonly number[], centre: readonly number[]): BufferGeometry {
  const { width, height } = HEAD.segments;
  return new SphereGeometry(1, width, height)
    .scale(radii[0], radii[1], radii[2])
    .translate(centre[0], centre[1], centre[2]);
}

export function handGeometry(side: number): BufferGeometry {
  const { length, width, thickness, radius, taper, tipThinning, thumb } = HAND;
  const palm = new RoundedBoxGeometry(width, length, thickness, 2, radius).translate(
    0,
    length / 2,
    0,
  );
  const position = palm.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const share = Math.max(position.getY(index) / length, 0);
    position.setX(index, position.getX(index) * (1 - taper * share ** 1.6));
    position.setZ(index, position.getZ(index) * (1 - tipThinning * share));
  }
  const digit = new CapsuleGeometry(thumb.radius, thumb.length, 4, 8)
    .translate(0, thumb.length / 2, 0)
    .rotateZ(-side * thumb.splayRad)
    .translate((side * width) / 2, thumb.base, thumb.palmward);
  const merged = mergeGeometries([palm.toNonIndexed(), digit.toNonIndexed()]);
  merged.computeVertexNormals();
  return merged;
}

export function footGeometry(): BufferGeometry {
  const heel = FOOT.profile[FOOT.profile.length - 1][0] * FOOT.heelShare;
  const points = FOOT.profile.map(([at, radius]) => new Vector2(Math.max(radius, 1e-4), at - heel));
  points.unshift(new Vector2(1e-4, -heel));
  return new LatheGeometry(points, FOOT.segments).scale(1, 1, FOOT.flatten);
}

export function capGeometry(): BufferGeometry {
  const { radii, centre } = HEAD.skull;
  const { width, height } = HEAD.segments;
  const { scale, coverRad, tilt } = HEAD.cap;
  return new SphereGeometry(1, width, height, 0, Math.PI * 2, 0, coverRad)
    .rotateZ(-QUARTER + tilt)
    .scale(radii[0] * scale, radii[1] * scale, radii[2] * scale)
    .translate(centre[0], centre[1], centre[2]);
}

export function bandGeometry(): BufferGeometry {
  const { radii, centre } = HEAD.skull;
  const { tube, scale, tiltRad, along } = HEAD.band;
  return new TorusGeometry(1, tube / radii[1], 6, HEAD.segments.width)
    .rotateY(QUARTER)
    .rotateZ(tiltRad)
    .scale(radii[0] * scale, radii[1] * scale, radii[2] * scale)
    .translate(centre[0] - along * radii[0], centre[1], centre[2]);
}

export function lensGeometry(): BufferGeometry {
  const { radii, x, y, z, toe } = HEAD.lens;
  const lens = (side: number) =>
    ellipsoid(radii, [0, 0, 0])
      .rotateX(side * toe)
      .translate(x, y, side * z);
  return mergeGeometries([lens(1), lens(-1)]);
}

export function neckGeometry(): BufferGeometry {
  return limbGeometry('neck').rotateZ(-QUARTER);
}

export interface TorsoGrid {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly xs: Float32Array;
  readonly ringSize: number;
}

function torsoChannel(axis: number, at: number): number {
  return clampedCurve(
    TORSO.stations.map((station) => [station[0], station[axis]] as const),
    at,
  );
}

function superellipse(value: number): number {
  return Math.sign(value) * Math.abs(value) ** (2 / TORSO.squareness);
}

export function torsoGrid(): TorsoGrid {
  const { rings, segments, stations } = TORSO;
  const ringSize = segments + 1;
  const first = stations[0][0];
  const last = stations[stations.length - 1][0];
  const positions: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const share = ring / rings;
    const x = lerp(first, last, 0.5 - 0.5 * Math.cos(Math.PI * share));
    const [halfWidth, halfThickness, lift] = [1, 2, 3].map((axis) => torsoChannel(axis, x));
    for (let step = 0; step <= segments; step++) {
      const angle = (step / segments) * Math.PI * 2;
      positions.push(
        x,
        lift + halfThickness * superellipse(Math.sin(angle)),
        halfWidth * superellipse(Math.cos(angle)),
      );
    }
  }
  const whole = new BufferGeometry();
  whole.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  whole.setIndex(torsoIndex(0, rings));
  whole.computeVertexNormals();
  const normals = whole.getAttribute('normal').array as Float32Array;
  const xs = new Float32Array(positions.filter((_, index) => index % XYZ === 0));
  whole.dispose();
  return { positions: new Float32Array(positions), normals, xs, ringSize };
}

function torsoIndex(fromRing: number, toRing: number): number[] {
  const ringSize = TORSO.segments + 1;
  const index: number[] = [];
  for (let ring = fromRing; ring < toRing; ring++) {
    for (let step = 0; step < TORSO.segments; step++) {
      const a = (ring - fromRing) * ringSize + step;
      const b = a + ringSize;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return index;
}

export function torsoPiece(grid: TorsoGrid, fromRing: number, toRing: number): BufferGeometry {
  const start = fromRing * grid.ringSize * XYZ;
  const end = (toRing + 1) * grid.ringSize * XYZ;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(grid.positions.slice(start, end), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(grid.normals.slice(start, end), XYZ));
  geometry.setIndex(torsoIndex(fromRing, toRing));
  return geometry;
}

export function ringAt(grid: TorsoGrid, x: number): number {
  const rings = grid.xs.length / grid.ringSize - 1;
  for (let ring = 0; ring <= rings; ring++) {
    if (grid.xs[ring * grid.ringSize] >= x) return ring;
  }
  return rings;
}

export const UP = new Vector3(0, 1, 0);

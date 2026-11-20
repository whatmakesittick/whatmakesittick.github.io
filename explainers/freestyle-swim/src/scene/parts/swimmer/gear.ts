import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Mesh, BufferGeometry } from 'three';
import type { PartBuilder } from './build';
import type { RestPose, Triple } from './skin/types';

const GOGGLES = {
  frame: { width: 0.024, height: 0.019, depth: 0.011 },
  lens: { width: 0.02, height: 0.015, depth: 0.008 },
  standOff: 0.004,
  lensAhead: 0.003,
  tiltRad: 0.3,
  bridgeRadius: 0.0022,
  strapRadius: 0.0035,
  strapSegments: 96,
  segments: [20, 12],
} as const;

const BAND = {
  fromWrist: 0.035,
  slice: 0.01,
  reach: 0.07,
  clearance: 0.0015,
  halfHeight: 0.009,
  thickness: 0.07,
  segments: 28,
} as const;

const SIDES = [1, -1] as const;
const DOWN = new Vector3(0, -1, 0);

function vector(value: Triple): Vector3 {
  return new Vector3(value[0], value[1], value[2]);
}

function ellipsoid(
  size: { width: number; height: number; depth: number },
  centre: Vector3,
  tilt: number,
): BufferGeometry {
  const [widthSegments, heightSegments] = GOGGLES.segments;
  const geometry = new SphereGeometry(1, widthSegments, heightSegments);
  geometry.scale(size.height, size.depth, size.width);
  geometry.rotateX(tilt);
  return geometry.translate(centre.x, centre.y, centre.z);
}

function lensCentre(rest: RestPose, side: number, ahead: number): Vector3 {
  const eye = vector(side > 0 ? rest.right.eye : rest.left.eye);
  return eye.addScaledVector(DOWN, rest.eyeRadius + GOGGLES.standOff + ahead);
}

function bridgeGeometry(rest: RestPose): BufferGeometry {
  const right = lensCentre(rest, 1, 0);
  const left = lensCentre(rest, -1, 0);
  const gap = right.distanceTo(left) - 2 * GOGGLES.frame.width;
  const geometry = new CylinderGeometry(GOGGLES.bridgeRadius, GOGGLES.bridgeRadius, gap, 6);
  geometry.rotateX(Math.PI / 2);
  const middle = right.add(left).multiplyScalar(0.5);
  return geometry.translate(middle.x, middle.y, middle.z);
}

function strapGeometry(rest: RestPose): BufferGeometry {
  const curve = new CatmullRomCurve3(rest.strap.map(vector), true);
  return new TubeGeometry(curve, GOGGLES.strapSegments, GOGGLES.strapRadius, 6, true);
}

export function buildGoggles(builder: PartBuilder, rest: RestPose, parent: Group): Group {
  const goggles = new Group();
  goggles.matrixAutoUpdate = false;
  parent.add(goggles);
  SIDES.forEach((side) => {
    const tilt = -side * GOGGLES.tiltRad;
    const frame = ellipsoid(GOGGLES.frame, lensCentre(rest, side, 0), tilt);
    const lens = ellipsoid(GOGGLES.lens, lensCentre(rest, side, GOGGLES.lensAhead), tilt);
    builder.mesh(frame, 'head', 'goggleBand', goggles);
    builder.mesh(lens, 'head', 'goggleLens', goggles);
  });
  builder.mesh(bridgeGeometry(rest), 'head', 'goggleBand', goggles);
  builder.mesh(strapGeometry(rest), 'head', 'goggleBand', goggles);
  return goggles;
}

function bandProfile(): Vector2[] {
  const { halfHeight, thickness } = BAND;
  const outer = 1 + thickness;
  return [
    new Vector2(1, -halfHeight),
    new Vector2(outer, -halfHeight * 0.7),
    new Vector2(outer, halfHeight * 0.7),
    new Vector2(1, halfHeight),
  ];
}

function bandRadii(positions: Float32Array, centre: Vector3, axes: readonly Vector3[]): number[] {
  const radii = [0, 0];
  const point = new Vector3();
  for (let index = 0; index < positions.length; index += 3) {
    point.fromArray(positions, index).sub(centre);
    const along = point.dot(axes[1]);
    if (Math.abs(along) > BAND.slice) continue;
    if (point.addScaledVector(axes[1], -along).length() > BAND.reach) continue;
    radii[0] = Math.max(radii[0], Math.abs(point.dot(axes[0])));
    radii[1] = Math.max(radii[1], Math.abs(point.dot(axes[2])));
  }
  return radii.map((radius) => radius + BAND.clearance);
}

export function buildWristband(
  builder: PartBuilder,
  rest: RestPose,
  positions: Float32Array,
  parent: Group,
): Mesh {
  const wrist = vector(rest.right.wrist);
  const axis = wrist.clone().sub(vector(rest.right.elbow)).normalize();
  const palm = vector(rest.right.palm);
  palm.addScaledVector(axis, -palm.dot(axis)).normalize();
  const side = new Vector3().crossVectors(palm, axis);
  const centre = wrist.addScaledVector(axis, -BAND.fromWrist);
  const [across, wide] = bandRadii(positions, centre, [palm, axis, side]);
  const geometry = new LatheGeometry(bandProfile(), BAND.segments);
  geometry.scale(across, 1, wide);
  geometry.applyMatrix4(new Matrix4().makeBasis(palm, axis, side).setPosition(centre));
  const band = builder.mesh(geometry, 'hand', 'wristband', parent);
  band.matrixAutoUpdate = false;
  return band;
}

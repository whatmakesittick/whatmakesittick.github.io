import { CapsuleGeometry, SphereGeometry, TorusGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ellipsoid } from './ellipsoid';
import { neckGeometry } from './limbs';
import { HEAD } from './shapes';

const QUARTER = Math.PI / 2;

function withoutUv<T extends BufferGeometry>(geometry: T): T {
  geometry.deleteAttribute('uv');
  return geometry;
}

function merged(parts: BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return result;
}

export function headSkinGeometry(): BufferGeometry {
  const { skull, jaw, chin, nose, ear, segments } = HEAD;
  const ears = [1, -1].map((side) =>
    ellipsoid(ear.radii, [ear.centre[0], ear.centre[1], side * ear.centre[2]]),
  );
  return merged([
    neckGeometry(),
    ellipsoid(skull.radii, skull.centre, segments),
    ellipsoid(jaw.radii, jaw.centre, segments),
    ellipsoid(chin.radii, chin.centre),
    ellipsoid(nose.radii, nose.centre),
    ...ears,
  ]);
}

function capTransform<T extends BufferGeometry>(geometry: T, scale: number): T {
  const { radii, centre } = HEAD.skull;
  return geometry
    .rotateZ(-QUARTER + HEAD.cap.tilt)
    .scale(radii[0] * scale, radii[1] * scale, radii[2] * scale)
    .translate(centre[0], centre[1], centre[2]);
}

function capShell(
  scale: number,
  phiStart: number,
  phiLength: number,
  thetaStart = 0,
): BufferGeometry {
  const { width, height } = HEAD.segments;
  return capTransform(
    withoutUv(
      new SphereGeometry(
        1,
        width,
        height,
        phiStart,
        phiLength,
        thetaStart,
        HEAD.cap.coverRad - thetaStart,
      ),
    ),
    scale,
  );
}

function capRim(): BufferGeometry {
  const { coverRad, scale, rim } = HEAD.cap;
  const ring = withoutUv(new TorusGeometry(Math.sin(coverRad), rim, 8, HEAD.segments.width))
    .rotateX(QUARTER)
    .translate(0, Math.cos(coverRad), 0);
  return capTransform(ring, scale);
}

export function capGeometry(): BufferGeometry {
  return merged([capShell(HEAD.cap.scale, 0, Math.PI * 2), capRim()]);
}

export function capStripeGeometry(): BufferGeometry {
  const { scale, half, from } = HEAD.stripe;
  return capShell(HEAD.cap.scale * scale, QUARTER - half, half * 2, from);
}

interface Lenslike {
  readonly radii: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly toe: number;
}

function lensPair(spec: Lenslike): BufferGeometry[] {
  const { radii, x, y, z, toe } = spec;
  return [1, -1].map((side) =>
    ellipsoid(radii, [0, 0, 0])
      .rotateX(side * toe)
      .translate(x, y, side * z),
  );
}

export function lensGeometry(): BufferGeometry {
  return merged(lensPair(HEAD.lens));
}

function strapGeometry(): BufferGeometry {
  const { radii, centre } = HEAD.skull;
  const { tube, scale, tiltRad, along } = HEAD.band;
  return withoutUv(new TorusGeometry(1, tube / radii[1], 6, HEAD.segments.width))
    .rotateY(QUARTER)
    .rotateZ(tiltRad)
    .scale(radii[0] * scale, radii[1] * scale, radii[2] * scale)
    .translate(centre[0] - along * radii[0], centre[1], centre[2]);
}

export function gogglesFrameGeometry(): BufferGeometry {
  const { radius, length, centre } = HEAD.bridge;
  const bridge = withoutUv(new CapsuleGeometry(radius, length, 4, 8))
    .rotateX(QUARTER)
    .translate(centre[0], centre[1], centre[2]);
  return merged([strapGeometry(), ...lensPair(HEAD.rim), bridge]);
}

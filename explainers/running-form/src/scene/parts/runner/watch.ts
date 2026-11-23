import { BufferAttribute, BufferGeometry, CylinderGeometry, Matrix4, Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { outermostHit } from '@core/figure/body/faceProbe';
import type { RestFrame } from '@core/figure/body/restFrame';

const AXES = 3;

export const WATCH = {
  fromWristM: 0.03,
  caseRadiusM: 0.023,
  caseHeightM: 0.0129,
  glassRadiusM: 0.0185,
  glassHeightM: 0.0012,
  strapWidthM: 0.022,
  strapThicknessM: 0.0022,
  strapGapM: 0.0012,
  segments: 40,
  ring: 36,
  nearM: 0.025,
} as const;

export interface WatchPlace {
  readonly centre: Vector3;
  readonly axis: Vector3;
  readonly dorsal: Vector3;
  readonly radial: Vector3;
  readonly joint: string;
}

function dominantJoint(figure: Figure, centre: Vector3): string {
  const totals = new Float32Array(figure.jointCount);
  const point = new Vector3();
  const { start, joints, weights } = figure.skin;
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    if (point.distanceTo(centre) > WATCH.nearM) continue;
    for (let i = start[v]; i < start[v + 1]; i++) totals[joints[i]] += weights[i];
  }
  let best = 0;
  totals.forEach((total, joint) => {
    if (total > totals[best]) best = joint;
  });
  return figure.jointNames[best];
}

export function watchPlace(figure: Figure, frame: RestFrame): WatchPlace {
  const wrist = frame.joint('l_wrist');
  const axis = wrist.clone().sub(frame.joint('l_lowarm')).normalize();
  const centre = wrist.clone().addScaledVector(axis, -WATCH.fromWristM);
  const thumb = frame.joint('l_thumb1').sub(centre);
  const radial = thumb.addScaledVector(axis, -thumb.dot(axis)).normalize();
  const dorsal = new Vector3().crossVectors(radial, axis).normalize();
  return { centre, axis, dorsal, radial, joint: dominantJoint(figure, centre) };
}

function radiusAt(figure: Figure, place: WatchPlace, direction: Vector3): number {
  const hit = outermostHit(figure, place.centre, direction);
  return hit ? hit.distanceTo(place.centre) : WATCH.caseRadiusM;
}

function basis(place: WatchPlace): Matrix4 {
  const ulnar = place.radial.clone().negate();
  return new Matrix4().makeBasis(ulnar, place.dorsal, place.axis).setPosition(place.centre);
}

export function strapGeometry(figure: Figure, place: WatchPlace): BufferGeometry {
  const positions: number[] = [];
  const offsets = [-0.5, -0.25, 0.25, 0.5];
  const bulge = [0, 1, 1, 0];
  for (let k = 0; k < WATCH.ring; k++) {
    const angle = (k / WATCH.ring) * Math.PI * 2;
    const direction = place.radial
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(place.dorsal, Math.sin(angle));
    const radius = radiusAt(figure, place, direction) + WATCH.strapGapM;
    offsets.forEach((offset, row) => {
      const reach = radius + WATCH.strapThicknessM * bulge[row];
      const point = place.centre
        .clone()
        .addScaledVector(direction, reach)
        .addScaledVector(place.axis, offset * WATCH.strapWidthM);
      positions.push(...point.toArray());
    });
  }
  const rows = offsets.length;
  const index: number[] = [];
  for (let k = 0; k < WATCH.ring; k++) {
    const next = (k + 1) % WATCH.ring;
    for (let r = 0; r < rows - 1; r++) {
      const a = k * rows + r;
      const b = next * rows + r;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(positions), AXES));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function onWrist(
  figure: Figure,
  place: WatchPlace,
  geometry: BufferGeometry,
  lift: number,
): BufferGeometry {
  const surface = radiusAt(figure, place, place.dorsal) + WATCH.strapThicknessM;
  geometry.translate(0, surface + lift, 0);
  return geometry.applyMatrix4(basis(place));
}

export function caseGeometry(figure: Figure, place: WatchPlace): BufferGeometry {
  const geometry = new CylinderGeometry(
    WATCH.caseRadiusM,
    WATCH.caseRadiusM * 0.94,
    WATCH.caseHeightM,
    WATCH.segments,
  );
  return onWrist(figure, place, geometry, WATCH.caseHeightM / 2);
}

export function glassGeometry(figure: Figure, place: WatchPlace): BufferGeometry {
  const geometry = new CylinderGeometry(
    WATCH.glassRadiusM,
    WATCH.glassRadiusM,
    WATCH.glassHeightM,
    WATCH.segments,
  );
  return onWrist(figure, place, geometry, WATCH.caseHeightM + WATCH.glassHeightM / 2 - 0.0004);
}

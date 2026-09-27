import { CapsuleGeometry, Group, Object3D } from 'three';
import type { BufferGeometry, Vector2 } from 'three';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import { COWLING, FUSELAGE, RADIAL_SEGMENTS } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface FuselagePart {
  object: Group;
  labelAnchor: Object3D;
}

const CAP_SEGMENTS = 8;
const LABEL_STATION = 0;
const CANOPY_CENTER = Math.PI * 1.5;

function radiusAt(profile: readonly Vector2[], station: number): number {
  return profile.reduce((nearest, point) =>
    Math.abs(point.y - station) < Math.abs(nearest.y - station) ? point : nearest,
  ).x;
}

function bodyGeometry(profile: readonly Vector2[]): BufferGeometry {
  const geometry = latheAlongX(profile, FUSELAGE.radialSegments);
  geometry.scale(1, 1, FUSELAGE.widthScale);
  return geometry;
}

function canopyGeometry(profile: readonly Vector2[]): BufferGeometry {
  const glazed = profile
    .filter((point) => point.y >= FUSELAGE.canopyStart && point.y <= FUSELAGE.canopyEnd)
    .map((point) => point.clone().setX(point.x * FUSELAGE.canopyInflate));
  const geometry = latheAlongX(glazed, FUSELAGE.radialSegments, {
    start: CANOPY_CENTER - FUSELAGE.canopyArc / 2,
    length: FUSELAGE.canopyArc,
  });
  geometry.scale(1, 1, FUSELAGE.widthScale);
  return geometry;
}

function cowlingGeometry(): BufferGeometry {
  const geometry = new CapsuleGeometry(
    COWLING.radius,
    COWLING.length,
    CAP_SEGMENTS,
    RADIAL_SEGMENTS,
  );
  geometry.rotateZ(Math.PI / 2);
  geometry.scale(1, COWLING.heightScale, 1);
  geometry.translate(COWLING.centerX, COWLING.centerY, 0);
  return geometry;
}

export function createFuselage(context: PartContext): FuselagePart {
  const object = new Group();
  const profile = sampleProfile(FUSELAGE.profile, FUSELAGE.profileSamples);
  const shell = new Group();
  shell.position.y = FUSELAGE.axisHeight;
  shell.add(
    partMesh(context, bodyGeometry(profile), 'fuselage', 'body'),
    partMesh(context, canopyGeometry(profile), 'fuselage', 'glass'),
  );
  object.add(shell, partMesh(context, cowlingGeometry(), 'fuselage', 'panel'));
  const labelAnchor = new Object3D();
  labelAnchor.position.set(
    LABEL_STATION,
    FUSELAGE.axisHeight,
    -radiusAt(profile, LABEL_STATION) * FUSELAGE.widthScale,
  );
  object.add(labelAnchor);
  return { object, labelAnchor };
}
